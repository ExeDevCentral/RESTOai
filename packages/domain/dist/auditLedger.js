import crypto from 'crypto';
export class AuditLedger {
    static records = [];
    static appendRecord(data) {
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
        const record = {
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
    static getLedger(organizationId) {
        return this.records.filter(r => r.organizationId === organizationId);
    }
    static verifyIntegrity(organizationId) {
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
//# sourceMappingURL=auditLedger.js.map