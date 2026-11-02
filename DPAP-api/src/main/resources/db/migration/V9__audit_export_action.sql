-- BRD Phase 6 — audit of data exports (NFR-8/17). Widen the audit action CHECK
-- to include EXPORT.
ALTER TABLE audit_log DROP CONSTRAINT audit_action_chk;
ALTER TABLE audit_log ADD CONSTRAINT audit_action_chk
    CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'EXPORT'));
