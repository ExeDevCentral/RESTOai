-- ============================================================================
-- KOBE Gastronomic Engine — Audit Ledger & Tamper-Proof Cryptographic Hash Chain
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    location_id UUID REFERENCES locations(id) ON DELETE RESTRICT,
    actor_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    request_id VARCHAR(100) NOT NULL,
    prev_hash VARCHAR(64),
    hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for timeline reconstruction
CREATE INDEX IF NOT EXISTS idx_audit_timeline 
ON audit_ledger(organization_id, created_at ASC);

-- 1. Anti-tampering rule: Revoke mutation privileges
REVOKE UPDATE, DELETE, TRUNCATE ON audit_ledger FROM PUBLIC;

-- 2. Trigger function to compute and enforce cryptographic hash chain
CREATE OR REPLACE FUNCTION fn_audit_append_hash()
RETURNS TRIGGER AS $$
DECLARE
    v_last_hash VARCHAR(64);
    v_computed_hash VARCHAR(64);
BEGIN
    -- Obtenemos el último hash registrado para esta organización
    SELECT hash INTO v_last_hash
    FROM audit_ledger
    WHERE organization_id = NEW.organization_id
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

    NEW.prev_hash := v_last_hash;

    -- Calculamos SHA-256 de: prev_hash || payload::text || action || actor_id || created_at
    v_computed_hash := encode(
        digest(
            COALESCE(NEW.prev_hash, '') ||
            NEW.organization_id::text ||
            COALESCE(NEW.location_id::text, '') ||
            NEW.actor_id::text ||
            NEW.action ||
            NEW.entity_type ||
            NEW.entity_id ||
            NEW.payload::text ||
            NEW.request_id ||
            NEW.created_at::text,
            'sha256'
        ),
        'hex'
    );

    NEW.hash := v_computed_hash;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_ledger_hash ON audit_ledger;
CREATE TRIGGER trg_audit_ledger_hash
BEFORE INSERT ON audit_ledger
FOR EACH ROW
EXECUTE FUNCTION fn_audit_append_hash();

-- Trigger preventivo adicional ante cualquier intento de UPDATE o DELETE
CREATE OR REPLACE FUNCTION fn_audit_block_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Tamper-Proof Violation: audit_ledger records are strictly immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_block_update ON audit_ledger;
CREATE TRIGGER trg_audit_block_update
BEFORE UPDATE OR DELETE ON audit_ledger
FOR EACH ROW
EXECUTE FUNCTION fn_audit_block_mutation();
