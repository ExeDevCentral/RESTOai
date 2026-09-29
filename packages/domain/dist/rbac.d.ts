export type RoleHierarchyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type RoleCode = 'OWNER' | 'ADMIN' | 'MANAGER' | 'AUDITOR' | 'CASHIER' | 'CHEF' | 'COOK' | 'BARTENDER' | 'WAITER' | 'RUNNER_HOST';
export declare const STANDARD_PERMISSIONS: readonly ["tenant:billing", "tenant:delete", "tenant:multilocation", "system:config", "system:users", "system:printers", "system:integrations", "audit:read", "orders:create", "orders:edit_own", "orders:view_tables", "orders:request_bill", "orders:void", "orders:refund", "orders:discount", "cash:open", "cash:collect", "cash:count", "cash:close", "cash:approve_close", "reports:operational", "reports:financial_sensitive", "kds:kitchen:view", "kds:kitchen:status", "kds:bar:view", "kds:bar:status", "kds:dispatch_delivered", "inventory:read", "inventory:receive_lots", "inventory:waste", "inventory:adjust", "recipes:manage", "catalog:edit", "reservations:manage"];
export type PermissionCode = typeof STANDARD_PERMISSIONS[number];
export interface RoleDefinition {
    code: RoleCode;
    name: string;
    level: RoleHierarchyLevel;
    defaultScope: 'ORGANIZATION' | 'LOCATION';
    defaultPermissions: PermissionCode[];
}
/**
 * Matriz Role x Permission (KOBE Engine Gastronómico)
 */
export declare const ROLE_DEFINITIONS: Record<RoleCode, RoleDefinition>;
export interface RoleAssignment {
    userId: string;
    roleCode: RoleCode;
    scope: 'ORGANIZATION' | 'LOCATION';
    organizationId: string;
    locationId?: string;
    permissions?: PermissionCode[];
}
export interface SecurityContext {
    userId: string;
    organizationId: string;
    locationId?: string;
    supervisorPin?: string;
}
export declare class RbacManager {
    private static readonly assignments;
    private static supervisorPins;
    static registerSupervisorPin(userId: string, pin: string): void;
    static assignRole(assignment: RoleAssignment): void;
    static clearAssignments(): void;
    static getRolesForUser(userId: string, scope: {
        organizationId: string;
        locationId?: string;
    }): RoleAssignment[];
    /**
     * Chequea si un usuario posee un permiso evaluando la matriz role x permission.
     * No usa comparaciones hardcodeadas 'if (role === admin)'
     */
    static hasPermission(userId: string, permission: PermissionCode, scope: {
        organizationId: string;
        locationId?: string;
    }): boolean;
    /**
     * Segregación de Funciones (SoD) y Operaciones Críticas:
     * - Anular ítems / comanda (orders:void)
     * - Reembolsos (orders:refund)
     * - Descuentos extraordinarios (orders:discount)
     * - Cierre definitivo de caja (cash:approve_close)
     *
     * Exige rol con nivel <= 3 (Owner, Admin o Manager) o autorización mediante PIN de supervisor.
     */
    static canExecuteCriticalAction(actorId: string, action: 'orders:void' | 'orders:refund' | 'orders:discount' | 'cash:approve_close', scope: {
        organizationId: string;
        locationId?: string;
    }, supervisorPin?: string): {
        allowed: boolean;
        reason?: string;
    };
    /**
     * Segregación de funciones específica de tesorería:
     * Quien cobra / abre una sesión de caja no puede auditarla ni aprobar su propio refund.
     */
    static validateSegregationOfDuties(cashierUserId: string, auditorOrApproverUserId: string): boolean;
}
//# sourceMappingURL=rbac.d.ts.map