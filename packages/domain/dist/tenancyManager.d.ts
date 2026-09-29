export interface TenancyContext {
    tenantId: string;
    locationId?: string;
    userId?: string;
}
export declare class TenancyManager {
    private static readonly contextStorage;
    static setContext(sessionId: string, ctx: TenancyContext): void;
    static getContext(sessionId: string): TenancyContext | undefined;
    static applyTenantFilter<T extends {
        organizationId: string;
    }>(sessionId: string, records: T[]): T[];
    static applyLocationFilter<T extends {
        organizationId: string;
        locationId?: string;
    }>(sessionId: string, records: T[]): T[];
}
//# sourceMappingURL=tenancyManager.d.ts.map