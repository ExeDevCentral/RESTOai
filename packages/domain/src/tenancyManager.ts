export interface TenancyContext {
  tenantId: string;
  locationId?: string;
  userId?: string;
}

export class TenancyManager {
  private static readonly contextStorage = new Map<string, TenancyContext>();

  static setContext(sessionId: string, ctx: TenancyContext) {
    this.contextStorage.set(sessionId, ctx);
  }

  static getContext(sessionId: string): TenancyContext | undefined {
    return this.contextStorage.get(sessionId);
  }

  static applyTenantFilter<T extends { organizationId: string }>(
    sessionId: string,
    records: T[]
  ): T[] {
    const ctx = this.getContext(sessionId);
    if (!ctx?.tenantId) {
      throw new Error('RLS Breach Prevention: No tenant context set for this session');
    }
    return records.filter(r => r.organizationId === ctx.tenantId);
  }

  static applyLocationFilter<T extends { organizationId: string; locationId?: string }>(
    sessionId: string,
    records: T[]
  ): T[] {
    const tenantFiltered = this.applyTenantFilter(sessionId, records);
    const ctx = this.getContext(sessionId);
    if (!ctx?.locationId) return tenantFiltered;
    return tenantFiltered.filter(r => !r.locationId || r.locationId === ctx.locationId);
  }
}
