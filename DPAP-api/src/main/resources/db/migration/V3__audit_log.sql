-- Audit trail: who did what, to which record, when.
CREATE TABLE audit_log (
    id          uuid PRIMARY KEY,
    at          timestamptz  NOT NULL,
    actor_email varchar(160) NOT NULL,
    action      varchar(16)  NOT NULL,
    entity_type varchar(40)  NOT NULL,
    entity_id   varchar(64)  NOT NULL,
    summary     varchar(240),
    CONSTRAINT audit_action_chk CHECK (action IN ('CREATE', 'UPDATE', 'DELETE'))
);

CREATE INDEX audit_log_at_idx ON audit_log (at DESC);
CREATE INDEX audit_log_entity_idx ON audit_log (entity_type, entity_id);
CREATE INDEX audit_log_actor_idx ON audit_log (actor_email);
