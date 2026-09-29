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
export declare class AuditLedger {
    private static readonly records;
    static appendRecord(data: Omit<AuditRecord, 'id' | 'prevHash' | 'hash' | 'createdAt'>): AuditRecord;
    static getLedger(organizationId: string): readonly AuditRecord[];
    static verifyIntegrity(organizationId: string): {
        isValid: boolean;
        brokenAtRecordId?: string;
    };
    static clearLedger(): void;
}
//# sourceMappingURL=auditLedger.d.ts.map