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
] as const;

export type PermissionCode = typeof STANDARD_PERMISSIONS[number];

export interface RoleAssignment {
  userId: string;
  roleCode: string;
  scope: 'ORGANIZATION' | 'LOCATION';
  organizationId: string;
  locationId?: string;
  permissions: PermissionCode[];
}

export class RbacManager {
  private static readonly assignments: RoleAssignment[] = [];

  static assignRole(assignment: RoleAssignment) {
    this.assignments.push(assignment);
  }

  static clearAssignments() {
    this.assignments.length = 0;
  }

  static hasPermission(
    userId: string,
    permission: PermissionCode,
    scope: { organizationId: string; locationId?: string }
  ): boolean {
    const userRoles = this.assignments.filter(a => a.userId === userId);

    for (const r of userRoles) {
      if (r.organizationId !== scope.organizationId) continue;

      // Rol a nivel Organización (ej: OWNER) otorga acceso a todas sus sucursales
      if (r.scope === 'ORGANIZATION' && r.permissions.includes(permission)) {
        return true;
      }

      // Rol a nivel Location (ej: WAITER en Local 1)
      if (
        r.scope === 'LOCATION' &&
        scope.locationId &&
        r.locationId === scope.locationId &&
        r.permissions.includes(permission)
      ) {
        return true;
      }
    }

    return false;
  }
}
