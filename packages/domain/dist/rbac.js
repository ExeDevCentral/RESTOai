export const STANDARD_PERMISSIONS = [
    'orders:create',
    'orders:cancel',
    'kds:view',
    'kds:dispatch',
    'inventory:read',
    'inventory:adjust',
    'cash:open',
    'cash:close',
    'audit:read'
];
export class RbacManager {
    static assignments = [];
    static assignRole(assignment) {
        this.assignments.push(assignment);
    }
    static clearAssignments() {
        this.assignments.length = 0;
    }
    static hasPermission(userId, permission, scope) {
        const userRoles = this.assignments.filter(a => a.userId === userId);
        for (const r of userRoles) {
            if (r.organizationId !== scope.organizationId)
                continue;
            // Rol a nivel Organización (ej: OWNER) otorga acceso a todas sus sucursales
            if (r.scope === 'ORGANIZATION' && r.permissions.includes(permission)) {
                return true;
            }
            // Rol a nivel Location (ej: WAITER en Local 1)
            if (r.scope === 'LOCATION' &&
                scope.locationId &&
                r.locationId === scope.locationId &&
                r.permissions.includes(permission)) {
                return true;
            }
        }
        return false;
    }
}
//# sourceMappingURL=rbac.js.map