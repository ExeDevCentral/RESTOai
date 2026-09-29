export type RoleHierarchyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type RoleCode = 
  | 'OWNER'
  | 'ADMIN'
  | 'MANAGER'
  | 'AUDITOR'
  | 'CASHIER'
  | 'CHEF'
  | 'COOK'
  | 'BARTENDER'
  | 'WAITER'
  | 'RUNNER_HOST';

export const STANDARD_PERMISSIONS = [
  // Tenant & Sistema
  'tenant:billing',
  'tenant:delete',
  'tenant:multilocation',
  'system:config',
  'system:users',
  'system:printers',
  'system:integrations',

  // Auditoría
  'audit:read',

  // Órdenes
  'orders:create',
  'orders:edit_own',
  'orders:view_tables',
  'orders:request_bill',
  'orders:void',
  'orders:refund',
  'orders:discount',

  // Caja & Pagos
  'cash:open',
  'cash:collect',
  'cash:count',
  'cash:close',
  'cash:approve_close',

  // Reportes & Finanzas
  'reports:operational',
  'reports:financial_sensitive',

  // Cocina & KDS
  'kds:kitchen:view',
  'kds:kitchen:status',
  'kds:bar:view',
  'kds:bar:status',
  'kds:dispatch_delivered',

  // Inventario & Recetas
  'inventory:read',
  'inventory:receive_lots',
  'inventory:waste',
  'inventory:adjust',
  'recipes:manage',
  'catalog:edit',

  // Salón & Reservas
  'reservations:manage'
] as const;

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
export const ROLE_DEFINITIONS: Record<RoleCode, RoleDefinition> = {
  OWNER: {
    code: 'OWNER',
    name: 'Owner (Dueño)',
    level: 1,
    defaultScope: 'ORGANIZATION',
    defaultPermissions: [...STANDARD_PERMISSIONS] // Todo: billing, multi-local, ver auditoría, borrar tenant, roles
  },
  ADMIN: {
    code: 'ADMIN',
    name: 'Admin (Sistema)',
    level: 2,
    defaultScope: 'ORGANIZATION',
    defaultPermissions: [
      'system:config',
      'system:users',
      'system:printers',
      'system:integrations',
      'catalog:edit',
      'recipes:manage',
      'reports:operational',
      'reservations:manage'
      // Sin ver finanzas sensibles ni auditoría financiera
    ]
  },
  MANAGER: {
    code: 'MANAGER',
    name: 'Manager (Encargado / Gerente)',
    level: 3,
    defaultScope: 'LOCATION',
    defaultPermissions: [
      'orders:create',
      'orders:edit_own',
      'orders:view_tables',
      'orders:request_bill',
      'orders:void',
      'orders:refund',
      'orders:discount',
      'cash:open',
      'cash:collect',
      'cash:count',
      'cash:close',
      'cash:approve_close',
      'reports:operational',
      'reports:financial_sensitive',
      'audit:read',
      'inventory:read',
      'inventory:receive_lots',
      'inventory:waste',
      'inventory:adjust',
      'recipes:manage',
      'catalog:edit',
      'reservations:manage',
      'kds:kitchen:view',
      'kds:bar:view'
    ]
  },
  AUDITOR: {
    code: 'AUDITOR',
    name: 'Auditor (Solo Lectura)',
    level: 3,
    defaultScope: 'LOCATION',
    defaultPermissions: [
      'audit:read',
      'reports:operational',
      'reports:financial_sensitive',
      'inventory:read'
      // Cero escritura (sin create, void, cash, etc.)
    ]
  },
  CASHIER: {
    code: 'CASHIER',
    name: 'Cashier (Cajero)',
    level: 4,
    defaultScope: 'LOCATION',
    defaultPermissions: [
      'orders:view_tables',
      'orders:request_bill',
      'cash:open',
      'cash:collect',
      'cash:count',
      'cash:close'
      // Sin editar carta ni stock, sin aprobar propios refunds ni auditoría
    ]
  },
  CHEF: {
    code: 'CHEF',
    name: 'Chef (Jefe de Cocina)',
    level: 4,
    defaultScope: 'LOCATION',
    defaultPermissions: [
      'recipes:manage',
      'inventory:read',
      'inventory:receive_lots',
      'inventory:waste',
      'inventory:adjust',
      'kds:kitchen:view',
      'kds:kitchen:status'
    ]
  },
  COOK: {
    code: 'COOK',
    name: 'Cook (Cocinero)',
    level: 5,
    defaultScope: 'LOCATION',
    defaultPermissions: [
      'kds:kitchen:view',
      'kds:kitchen:status'
    ]
  },
  BARTENDER: {
    code: 'BARTENDER',
    name: 'Bartender',
    level: 5,
    defaultScope: 'LOCATION',
    defaultPermissions: [
      'kds:bar:view',
      'kds:bar:status',
      'inventory:read'
    ]
  },
  WAITER: {
    code: 'WAITER',
    name: 'Waiter (Mozo)',
    level: 6,
    defaultScope: 'LOCATION',
    defaultPermissions: [
      'orders:create',
      'orders:edit_own',
      'orders:view_tables',
      'orders:request_bill'
      // Sin cobrar ni anular ni ver auditoría
    ]
  },
  RUNNER_HOST: {
    code: 'RUNNER_HOST',
    name: 'Runner / Host',
    level: 7,
    defaultScope: 'LOCATION',
    defaultPermissions: [
      'orders:view_tables',
      'kds:dispatch_delivered',
      'reservations:manage'
    ]
  }
};

export interface RoleAssignment {
  userId: string;
  roleCode: RoleCode;
  scope: 'ORGANIZATION' | 'LOCATION';
  organizationId: string;
  locationId?: string;
  permissions?: PermissionCode[]; // Si se omite, usa la matriz default del rol
}

export interface SecurityContext {
  userId: string;
  organizationId: string;
  locationId?: string;
  supervisorPin?: string;
}

export class RbacManager {
  private static readonly assignments: RoleAssignment[] = [];
  private static supervisorPins = new Map<string, string>(); // userId -> PIN

  static registerSupervisorPin(userId: string, pin: string) {
    this.supervisorPins.set(userId, pin);
  }

  static assignRole(assignment: RoleAssignment) {
    // Si no trae lista explícita, hereda de la matriz del rol
    const perms = assignment.permissions && assignment.permissions.length > 0
      ? assignment.permissions
      : ROLE_DEFINITIONS[assignment.roleCode].defaultPermissions;

    this.assignments.push({
      ...assignment,
      permissions: perms
    });
  }

  static clearAssignments() {
    this.assignments.length = 0;
    this.supervisorPins.clear();
  }

  static getRolesForUser(userId: string, scope: { organizationId: string; locationId?: string }): RoleAssignment[] {
    return this.assignments.filter(a => {
      if (a.userId !== userId) return false;
      if (a.organizationId !== scope.organizationId) return false;
      if (a.scope === 'ORGANIZATION') return true;
      return a.locationId === scope.locationId;
    });
  }

  /**
   * Chequea si un usuario posee un permiso evaluando la matriz role x permission.
   * No usa comparaciones hardcodeadas 'if (role === admin)'
   */
  static hasPermission(
    userId: string,
    permission: PermissionCode,
    scope: { organizationId: string; locationId?: string }
  ): boolean {
    const applicableRoles = this.getRolesForUser(userId, scope);

    for (const r of applicableRoles) {
      if (r.permissions && r.permissions.includes(permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Segregación de Funciones (SoD) y Operaciones Críticas:
   * - Anular ítems / comanda (orders:void)
   * - Reembolsos (orders:refund)
   * - Descuentos extraordinarios (orders:discount)
   * - Cierre definitivo de caja (cash:approve_close)
   * 
   * Exige rol con nivel <= 3 (Owner, Admin o Manager) o autorización mediante PIN de supervisor.
   */
  static canExecuteCriticalAction(
    actorId: string,
    action: 'orders:void' | 'orders:refund' | 'orders:discount' | 'cash:approve_close',
    scope: { organizationId: string; locationId?: string },
    supervisorPin?: string
  ): { allowed: boolean; reason?: string } {
    // 1. Si el usuario mismo tiene el permiso por matriz (ej: Owner o Manager)
    if (this.hasPermission(actorId, action, scope)) {
      return { allowed: true };
    }

    // 2. Si se proporciona PIN de un supervisor (Manager/Owner de ese scope)
    if (supervisorPin) {
      for (const [supId, pin] of this.supervisorPins.entries()) {
        if (pin === supervisorPin && this.hasPermission(supId, action, scope)) {
          return { allowed: true };
        }
      }
      return { allowed: false, reason: 'Invalid supervisor PIN for critical action' };
    }

    return {
      allowed: false,
      reason: `Action requires role level <= 3 (Manager/Owner) or supervisor PIN approval`
    };
  }

  /**
   * Segregación de funciones específica de tesorería:
   * Quien cobra / abre una sesión de caja no puede auditarla ni aprobar su propio refund.
   */
  static validateSegregationOfDuties(
    cashierUserId: string,
    auditorOrApproverUserId: string
  ): boolean {
    return cashierUserId !== auditorOrApproverUserId;
  }
}
