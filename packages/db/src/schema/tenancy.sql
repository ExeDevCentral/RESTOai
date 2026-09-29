-- ============================================================================
-- KOBE Gastronomic Engine — Tenancy, Locations and Context Functions
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Context setter function
CREATE OR REPLACE FUNCTION set_app_context(
    p_tenant_id UUID,
    p_location_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', COALESCE(p_tenant_id::TEXT, ''), false);
    PERFORM set_config('app.current_location_id', COALESCE(p_location_id::TEXT, ''), false);
    PERFORM set_config('app.current_user_id', COALESCE(p_user_id::TEXT, ''), false);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
DECLARE
    v_val TEXT := current_setting('app.current_tenant_id', true);
BEGIN
    IF v_val IS NULL OR v_val = '' THEN
        RETURN NULL;
    END IF;
    RETURN v_val::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_location_id() RETURNS UUID AS $$
DECLARE
    v_val TEXT := current_setting('app.current_location_id', true);
BEGIN
    IF v_val IS NULL OR v_val = '' THEN
        RETURN NULL;
    END IF;
    RETURN v_val::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
DECLARE
    v_val TEXT := current_setting('app.current_user_id', true);
BEGIN
    IF v_val IS NULL OR v_val = '' THEN
        RETURN NULL;
    END IF;
    RETURN v_val::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- 1. Organizations (Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50) NOT NULL UNIQUE, -- CUIT en Argentina
    legal_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Locations (Sucursales físicas)
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Users (Identidades)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Organization Memberships
CREATE TABLE IF NOT EXISTS organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- OWNER, ADMIN, AUDITOR
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_user UNIQUE(organization_id, user_id)
);

-- 5. Location Memberships
CREATE TABLE IF NOT EXISTS location_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- CHEF, WAITER, CASHIER, MANAGER
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_loc_user UNIQUE(location_id, user_id)
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_locations ON locations
    FOR ALL
    USING (organization_id = current_tenant_id())
    WITH CHECK (organization_id = current_tenant_id());
