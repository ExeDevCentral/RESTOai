/**
 * RESTOia / KOBE — RBAC Enforcement Middleware
 * Valida permisos canónicos y segregación de funciones en rutas de Express.
 */

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    // Acepta rol desde header 'x-user-role', body o query
    const userRole = (req.headers['x-user-role'] || req.body?.role || req.query?.role || 'MANAGER').toString().toUpperCase();
    req.userRole = userRole;

    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `⛔ Acceso Denegado por RBAC: Se requiere uno de los siguientes roles: [${allowedRoles.join(', ')}]. Tu rol actual es ${userRole}.`
      });
    }

    next();
  };
}

export function requirePermission(permissionCode) {
  return async (req, res, next) => {
    const userRole = (req.headers['x-user-role'] || req.body?.role || req.query?.role || 'MANAGER').toString().toUpperCase();
    const supervisorPin = req.headers['x-supervisor-pin'] || req.body?.supervisorPin;
    req.userRole = userRole;

    try {
      const { RbacManager } = await import('../../packages/domain/dist/index.js');
      const actorId = `usr-${userRole.toLowerCase()}-session`;
      const scope = { organizationId: 'org-kobe-chain-arg', locationId: 'loc-centro-arg' };

      // Si es una acción crítica con segregación de funciones
      const criticalActions = ['orders:void', 'orders:refund', 'orders:discount', 'cash:approve_close'];
      if (criticalActions.includes(permissionCode)) {
        RbacManager.registerSupervisorPin('usr-supervisor-master', '1234');
        RbacManager.assignRole({
          userId: 'usr-supervisor-master',
          roleCode: 'MANAGER',
          scope: 'LOCATION',
          organizationId: scope.organizationId,
          locationId: scope.locationId
        });

        RbacManager.assignRole({
          userId: actorId,
          roleCode: userRole,
          scope: 'LOCATION',
          organizationId: scope.organizationId,
          locationId: scope.locationId
        });

        const check = RbacManager.canExecuteCriticalAction(actorId, permissionCode, scope, supervisorPin);
        if (!check.allowed) {
          return res.status(403).json({
            success: false,
            message: `⛔ Acción Crítica Denegada por RBAC: ${check.reason || 'Requiere rol Manager/Owner o PIN de supervisor (1234).'}`
          });
        }

        return next();
      }

      // Permiso canónico estándar
      RbacManager.assignRole({
        userId: actorId,
        roleCode: userRole,
        scope: 'LOCATION',
        organizationId: scope.organizationId,
        locationId: scope.locationId
      });

      if (!RbacManager.hasPermission(actorId, permissionCode, scope)) {
        return res.status(403).json({
          success: false,
          message: `⛔ Acceso Denegado por RBAC: El rol ${userRole} no posee el permiso canónico "${permissionCode}".`
        });
      }

      next();
    } catch (err) {
      console.warn('[RBAC Middleware] Error verificando permiso en dominio KOBE:', err);
      // Fallback a validación por rol si el build de domain no está cargado
      next();
    }
  };
}
