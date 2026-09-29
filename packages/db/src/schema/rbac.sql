-- ============================================================================
-- KOBE Gastronomic Engine — RBAC: Roles, Permissions & Grants
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL -- ORDERS, KITCHEN, INVENTORY, CASH, AUDIT, HR
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL, -- OWNER, ADMIN, CHEF, WAITER, CASHIER, AUDITOR
    name VARCHAR(100) NOT NULL,
    scope VARCHAR(20) NOT NULL DEFAULT 'LOCATION', -- 'ORGANIZATION' | 'LOCATION'
    CONSTRAINT uq_org_role UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_location_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id, location_id, role_id)
);

-- Seed standard gastronomy permissions
INSERT INTO permissions (code, description, category) VALUES
('orders:create', 'Crear órdenes y comandas', 'ORDERS'),
('orders:cancel', 'Cancelar órdenes no iniciadas', 'ORDERS'),
('kds:view', 'Visualizar pantalla de cocina KDS', 'KITCHEN'),
('kds:dispatch', 'Despachar y marcar platos listos', 'KITCHEN'),
('inventory:read', 'Consultar stock y lotes', 'INVENTORY'),
('inventory:adjust', 'Ajustar stock por merma o auditoría', 'INVENTORY'),
('cash:open', 'Apertura de sesión de caja', 'CASH'),
('cash:close', 'Cierre de arqueo y registro de discrepancia', 'CASH'),
('audit:read', 'Consultar hash chain de auditoría', 'AUDIT')
ON CONFLICT (code) DO NOTHING;
