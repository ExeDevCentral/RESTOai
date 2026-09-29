export class TenancyManager {
    static contextStorage = new Map();
    static setContext(sessionId, ctx) {
        this.contextStorage.set(sessionId, ctx);
    }
    static getContext(sessionId) {
        return this.contextStorage.get(sessionId);
    }
    static applyTenantFilter(sessionId, records) {
        const ctx = this.getContext(sessionId);
        if (!ctx?.tenantId) {
            throw new Error('RLS Breach Prevention: No tenant context set for this session');
        }
        return records.filter(r => r.organizationId === ctx.tenantId);
    }
    static applyLocationFilter(sessionId, records) {
        const tenantFiltered = this.applyTenantFilter(sessionId, records);
        const ctx = this.getContext(sessionId);
        if (!ctx?.locationId)
            return tenantFiltered;
        return tenantFiltered.filter(r => !r.locationId || r.locationId === ctx.locationId);
    }
}
//# sourceMappingURL=tenancyManager.js.map