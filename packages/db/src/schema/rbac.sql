-- ============================================================================
-- KOBE Gastronomic Engine — RBAC: Roles, Permissions & Grants
-- Estructura jerárquica de 7 niveles y matriz role × permission
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- TENANT, ORDERS, CASH, AUDIT, KITCHEN, INVENTORY, SYSTEM, HR
    description TEXT
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL, -- OWNER, ADMIN, MANAGER, AUDITOR, CASHIER, CHEF, COOK, BARTENDER, WAITER, RUNNER_HOST
    name VARCHAR(100) NOT NULL,
    hierarchy_level INT NOT NULL CHECK (hierarchy_level BETWEEN 1 AND 7),
    scope VARCHAR(20) NOT NULL DEFAULT 'LOCATION', -- 'ORGANIZATION' | 'LOCATION'
    CONSTRAINT uq_org_role UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(role_id, permission_id)
);

-- Asignación de roles por usuario y local:
-- Un usuario puede tener varios roles y distinto rol por local
CREATE TABLE IF NOT EXISTS user_location_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE, -- NULL si el scope es ORGANIZATION
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    supervisor_pin VARCHAR(6), -- PIN para autorizar acciones críticas (void, refund, discount)
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_location_role UNIQUE(user_id, organization_id, location_id, role_id)
);

-- ============================================================================
-- Catálogo Estándar de Permisos Granulares Gastronómicos
-- ============================================================================
INSERT INTO permissions (code, name, category, description) VALUES
-- Tenant & Sistema
('tenant:billing', 'Gestión de Suscripción y Facturación', 'TENANT', 'Acceso a pagos del SaaS y facturas del tenant'),
('tenant:delete', 'Eliminación del Tenant', 'TENANT', 'Destrucción o baja total de la organización'),
('tenant:multilocation', 'Gestión Multi-Local', 'TENANT', 'Crear y administrar sucursales de la cadena'),
('system:config', 'Configuración Técnica', 'SYSTEM', 'Configuración de red, impresoras y parámetros del sistema'),
('system:users', 'Gestión de Usuarios y Roles', 'SYSTEM', 'Crear usuarios, mozos y asignar roles'),
('system:printers', 'Gestión de Impresoras Comanderas', 'SYSTEM', 'Configurar puertos ESC/POS de comandas'),
('system:integrations', 'Integraciones Externas', 'SYSTEM', 'Configuración de Mercado Pago, delivery apps y webhooks'),

-- Auditoría
('audit:read', 'Lectura de Cadena de Auditoría', 'AUDIT', 'Visualizar eventos y verificar integridad SHA-256'),

-- Órdenes
('orders:create', 'Crear Comandas y Pedidos', 'ORDERS', 'Abrir pedidos para mesas o mostrador'),
('orders:edit_own', 'Editar Comandas Propias', 'ORDERS', 'Agregar platos a sus propias órdenes antes de cocina'),
('orders:view_tables', 'Ver Estado de Salón', 'ORDERS', 'Visualizar mapa de ocupación y mesas'),
('orders:request_bill', 'Pedir Cuenta / Pre-Ticket', 'ORDERS', 'Imprimir pre-cuenta y pasar mesa a cuenta_pedida'),
('orders:void', 'Anular Ítems o Comandas', 'ORDERS', 'Acción crítica: anula platos marchados con registro en audit'),
('orders:refund', 'Emitir Reembolsos', 'ORDERS', 'Acción crítica: emite nota de crédito / devolución'),
('orders:discount', 'Aplicar Descuentos Mayores', 'ORDERS', 'Acción crítica: descuentos comerciales extraordinarios'),

-- Caja & Pagos
('cash:open', 'Apertura de Sesión de Caja', 'CASH', 'Declarar fondo inicial y abrir turno de caja'),
('cash:collect', 'Cobrar Comandas', 'CASH', 'Procesar pagos en efectivo, tarjeta o QR'),
('cash:count', 'Arqueo de Efectivo', 'CASH', 'Contar billetes y asentar cierre ciego'),
('cash:close', 'Cerrar Turno de Caja', 'CASH', 'Finalizar sesión de caja'),
('cash:approve_close', 'Aprobar Cierre con Discrepancia', 'CASH', 'Acción crítica: valida faltantes/sobrantes de caja'),

-- Reportes & Finanzas
('reports:operational', 'Reportes Operativos', 'REPORTS', 'Tiempos de despacho, rotación de mesas, platos más vendidos'),
('reports:financial_sensitive', 'Reportes Financieros Sensibles', 'REPORTS', 'Márgenes de ganancia, costos reales, libro IVA ventas'),

-- Cocina & KDS
('kds:kitchen:view', 'Visualizar KDS Cocina', 'KITCHEN', 'Ver comandas de cocina caliente y fría'),
('kds:kitchen:status', 'Avanzar Estado KDS Cocina', 'KITCHEN', 'Marcar PREPARING -> READY en cocina'),
('kds:bar:view', 'Visualizar KDS Barra', 'KITCHEN', 'Ver comandas de tragos y cafetería'),
('kds:bar:status', 'Avanzar Estado KDS Barra', 'KITCHEN', 'Marcar PREPARING -> READY en barra'),
('kds:dispatch_delivered', 'Marcar Platos Servidos', 'KITCHEN', 'Runner/Mozo marca comanda como entregada a la mesa'),

-- Inventario & Recetas
('inventory:read', 'Consultar Stock y Lotes', 'INVENTORY', 'Ver existencias en cámara y depósito'),
('inventory:receive_lots', 'Recepción de Mercadería', 'INVENTORY', 'Ingresar lotes, vencimiento y remitos de proveedores'),
('inventory:waste', 'Registrar Mermas de Cocina', 'INVENTORY', 'Asentar desperdicios y pérdidas operativas'),
('inventory:adjust', 'Ajuste Manual de Inventario', 'INVENTORY', 'Corregir stock físico vs contable'),
('recipes:manage', 'Gestión de Recetas y Escandallos', 'INVENTORY', 'Configurar ingredientes y costos de platos'),
('catalog:edit', 'Modificar Carta y Precios', 'INVENTORY', 'Crear, editar o deshabilitar platos'),

-- Salón & Reservas
('reservations:manage', 'Gestionar Reservas y Recepción', 'SALON', 'Confirmar comensales y asignar mesas')
ON CONFLICT (code) DO NOTHING;
