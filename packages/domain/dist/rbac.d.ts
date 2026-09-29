export declare const STANDARD_PERMISSIONS: readonly ["orders:create", "orders:cancel", "kds:view", "kds:dispatch", "inventory:read", "inventory:adjust", "cash:open", "cash:close", "audit:read"];
export type PermissionCode = typeof STANDARD_PERMISSIONS[number];
export interface RoleAssignment {
    userId: string;
    roleCode: string;
    scope: 'ORGANIZATION' | 'LOCATION';
    organizationId: string;
    locationId?: string;
    permissions: PermissionCode[];
}
export declare class RbacManager {
    private static readonly assignments;
    static assignRole(assignment: RoleAssignment): void;
    static clearAssignments(): void;
    static hasPermission(userId: string, permission: PermissionCode, scope: {
        organizationId: string;
        locationId?: string;
    }): boolean;
}
//# sourceMappingURL=rbac.d.ts.map