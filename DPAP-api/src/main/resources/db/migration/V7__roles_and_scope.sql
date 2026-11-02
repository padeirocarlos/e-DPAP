-- BRD Phase 2 — the six roles (§3.3) and optional per-user geographic scope
-- (FR-AUTH-2). Migrates the three legacy roles to their BRD equivalents, widens
-- the CHECK, and adds the user_scope table.

-- Drop the old 3-role constraint, remap existing users, add the 6-role constraint.
ALTER TABLE app_user DROP CONSTRAINT app_user_role_chk;

UPDATE app_user SET role = 'SYS_ADMIN'    WHERE role = 'ADMINISTRATOR';
UPDATE app_user SET role = 'DATA_MANAGER' WHERE role = 'EDITOR';
UPDATE app_user SET role = 'ANALYST'      WHERE role = 'VIEWER';

ALTER TABLE app_user ADD CONSTRAINT app_user_role_chk CHECK (role IN (
    'SYS_ADMIN', 'DATA_MANAGER', 'SUPERVISOR', 'ENUMERATOR', 'ANALYST', 'PARTNER'));

-- Geographic scope: a user may be limited to a set of districts (SDAE analysts,
-- supervisors of a district team). No rows = province-wide (unscoped).
CREATE TABLE user_scope (
    user_id       uuid        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    district_code varchar(16) NOT NULL REFERENCES district (code),
    PRIMARY KEY (user_id, district_code)
);
CREATE INDEX user_scope_user_idx ON user_scope (user_id);
