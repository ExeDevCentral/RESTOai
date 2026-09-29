import crypto from 'crypto';

export interface AuditRecord {
  id: string;
  organizationId: string;
  locationId?: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, any>;
  requestId: string;
  prevHash: string | null;
  hash: string;
  createdAt: string;
}

export class AuditLedger {
  private static readonly records: AuditRecord[] = [];

  static appendRecord(data: Omit<AuditRecord, 'id' | 'prevHash' | 'hash' | 'createdAt'>): AuditRecord {
    const orgRecords = this.records.filter(r => r.organizationId === data.organizationId);
    const lastRecord = orgRecords.length > 0 ? orgRecords[orgRecords.length - 1] : null;
    const prevHash = lastRecord ? lastRecord.hash : null;
    const createdAt = new Date().toISOString();

    const rawPayload = [
      prevHash || '',
      data.organizationId,
      data.locationId || '',
      data.actorId,
      data.action,
      data.entityType,
      data.entityId,
      JSON.stringify(data.payload),
      data.requestId,
      createdAt
    ].join('|');

    const hash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    const record: AuditRecord = {
      id: crypto.randomUUID(),
      ...data,
      prevHash,
      hash,
      createdAt
    };

    // Inmutabilidad: freeze del objeto
    Object.freeze(record);
    this.records.push(record);
    return record;
  }

  static getLedger(organizationId: string): readonly AuditRecord[] {
    return this.records.filter(r => r.organizationId === organizationId);
  }

  static verifyIntegrity(organizationId: string): { isValid: boolean; brokenAtRecordId?: string } {
    const chain = this.records.filter(r => r.organizationId === organizationId);

    for (let i = 0; i < chain.length; i++) {
      const current = chain[i];
      const prev = i > 0 ? chain[i - 1] : null;

      // 1. Chequeo de encadenamiento de prevHash
      if (prev && current.prevHash !== prev.hash) {
        return { isValid: false, brokenAtRecordId: current.id };
      }
      if (!prev && current.prevHash !== null) {
        return { isValid: false, brokenAtRecordId: current.id };
      }

      // 2. Recálculo criptográfico del hash
      const rawPayload = [
        current.prevHash || '',
        current.organizationId,
        current.locationId || '',
        current.actorId,
        current.action,
        current.entityType,
        current.entityId,
        JSON.stringify(current.payload),
        current.requestId,
        current.createdAt
      ].join('|');

      const expectedHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
      if (current.hash !== expectedHash) {
        return { isValid: false, brokenAtRecordId: current.id };
      }
    }

    return { isValid: true };
  }

  static clearLedger() {
    this.records.length = 0;
  }
}
