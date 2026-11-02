-- BRD Phase 1 — survey/registry data model (BRD Section 6). Additive: the
-- existing `actor` table stays the registry master; this migration adds the
-- submission workflow, rosters, network, programmes, QC and review tables, the
-- form-version / survey-round tables, and extends the administrative hierarchy.
--
-- Storage decision (BRD §6.1 allows "JSONB + typed columns"): routing and
-- registry keys are typed, indexed columns on `submission`; every other scalar
-- answer lives in `submission.answers` (jsonb). Rosters use a single generic
-- `roster_row` table keyed by `roster_id` (faithful to "one table per roster"
-- via filter, but stable across form versions — FR-FORM-10).

-- ---------------------------------------------------------------------------
-- Administrative hierarchy: Village level + optional boundary polygons (FR-ADM-1).
-- ---------------------------------------------------------------------------
CREATE TABLE village (
    code          varchar(32) PRIMARY KEY,
    locality_code varchar(24) NOT NULL REFERENCES locality (code),
    name          varchar(80) NOT NULL
);
CREATE INDEX village_locality_idx ON village (locality_code);

ALTER TABLE district            ADD COLUMN boundary geography(MultiPolygon, 4326);
ALTER TABLE administrative_post ADD COLUMN boundary geography(MultiPolygon, 4326);
ALTER TABLE locality            ADD COLUMN boundary geography(MultiPolygon, 4326);

-- ---------------------------------------------------------------------------
-- Versioned questionnaire schema (FR-FORM-10). `schema_json` is the data
-- dictionary for this version (FR-EXP-3) — the contents of form_schema.json.
-- ---------------------------------------------------------------------------
CREATE TABLE form_version (
    id           uuid PRIMARY KEY,
    version      varchar(32) NOT NULL UNIQUE,
    status       varchar(16) NOT NULL DEFAULT 'DRAFT',
    schema_json  text        NOT NULL,
    published_at timestamptz,
    created_at   timestamptz NOT NULL,
    CONSTRAINT form_version_status_chk CHECK (status IN ('DRAFT', 'PUBLISHED', 'RETIRED'))
);

-- ---------------------------------------------------------------------------
-- Data collection campaign / round (FR-ADM-3).
-- ---------------------------------------------------------------------------
CREATE TABLE survey_round (
    id              uuid PRIMARY KEY,
    name            varchar(120) NOT NULL,
    status          varchar(16)  NOT NULL DEFAULT 'PLANNED',
    start_date      date,
    end_date        date,
    form_version_id uuid REFERENCES form_version (id),
    created_at      timestamptz  NOT NULL,
    CONSTRAINT survey_round_status_chk CHECK (status IN ('PLANNED', 'ACTIVE', 'CLOSED'))
);

-- ---------------------------------------------------------------------------
-- Actor registry extensions (FR-REG-1/2; BR-RG-2 merge redirect, FR-PRV-5 anonymise).
-- ---------------------------------------------------------------------------
ALTER TABLE actor
    ADD COLUMN actor_uid       varchar(40),
    ADD COLUMN registry_status varchar(16) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN merged_into_id  uuid REFERENCES actor (id);
CREATE UNIQUE INDEX actor_uid_uq ON actor (actor_uid) WHERE actor_uid IS NOT NULL;
ALTER TABLE actor ADD CONSTRAINT actor_registry_status_chk
    CHECK (registry_status IN ('ACTIVE', 'MERGED', 'ANONYMISED'));

-- ---------------------------------------------------------------------------
-- Submission: one interview (questionnaire instance). `id` is a surrogate uuid;
-- `questionnaire_number` is 0.01; `client_uuid` makes sync idempotent (NFR-9).
-- ---------------------------------------------------------------------------
CREATE TABLE submission (
    id                   uuid PRIMARY KEY,
    questionnaire_number bigserial    UNIQUE,
    client_uuid          uuid         UNIQUE,
    actor_id             uuid REFERENCES actor (id),
    round_id             uuid REFERENCES survey_round (id),
    form_version         varchar(32)  NOT NULL,
    status               varchar(16)  NOT NULL DEFAULT 'DRAFT',
    enumerator_id        uuid REFERENCES app_user (id),
    supervisor_id        uuid REFERENCES app_user (id),
    -- Module 0 typed keys
    interview_date       date,
    start_time           time,
    end_time             time,
    district_code        varchar(16) REFERENCES district (code),
    admin_post           varchar(255),
    locality             varchar(255),
    village              varchar(255),
    latitude             double precision,
    longitude            double precision,
    gps_accuracy_m       double precision,
    gps_altitude_m       double precision,
    consent              boolean,
    actor_type           integer,
    interview_result     integer,
    -- Module A registry keys (search / dedup / indicators)
    actor_name              varchar(255),
    acronym                 varchar(255),
    operation_level         integer,
    legal_status            integer,
    nuit                    varchar(9),
    contact_sharing_consent boolean,
    -- every other scalar answer, keyed by variable (qX_YY)
    answers              jsonb        NOT NULL DEFAULT '{}'::jsonb,
    -- paradata / sync envelope
    device_id            varchar(120),
    app_version          varchar(40),
    submitted_at         timestamptz,
    reviewed_at          timestamptz,
    published_at         timestamptz,
    sync_status          varchar(16)  NOT NULL DEFAULT 'SYNCED',
    version              bigint       NOT NULL DEFAULT 0,
    created_at           timestamptz  NOT NULL,
    updated_at           timestamptz  NOT NULL,
    created_by           varchar(160),
    updated_by           varchar(160),
    geom geography(Point, 4326) GENERATED ALWAYS AS (
        CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
             THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography END
    ) STORED,
    CONSTRAINT submission_status_chk CHECK (status IN (
        'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RETURNED', 'APPROVED', 'PUBLISHED', 'REJECTED')),
    CONSTRAINT submission_sync_chk CHECK (sync_status IN ('SYNCED', 'PENDING', 'CONFLICT'))
);
CREATE INDEX submission_status_idx ON submission (status);
CREATE INDEX submission_actor_idx ON submission (actor_id);
CREATE INDEX submission_round_idx ON submission (round_id);
CREATE INDEX submission_district_idx ON submission (district_code);
CREATE INDEX submission_actor_type_idx ON submission (actor_type);
CREATE INDEX submission_enumerator_idx ON submission (enumerator_id);
CREATE INDEX submission_geom_gix ON submission USING GIST (geom);
CREATE INDEX submission_answers_gin ON submission USING GIN (answers);
CREATE INDEX submission_name_lower_idx ON submission (lower(actor_name));

-- ---------------------------------------------------------------------------
-- Generic roster storage: one row per roster row across all 20 rosters.
-- ---------------------------------------------------------------------------
CREATE TABLE roster_row (
    id            uuid PRIMARY KEY,
    submission_id uuid        NOT NULL REFERENCES submission (id) ON DELETE CASCADE,
    roster_id     varchar(16) NOT NULL,
    row_index     integer     NOT NULL DEFAULT 0,
    row_code      integer,
    data          jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at    timestamptz NOT NULL
);
CREATE INDEX roster_row_submission_idx ON roster_row (submission_id);
CREATE INDEX roster_row_roster_idx ON roster_row (roster_id);

-- ---------------------------------------------------------------------------
-- Network edges derived from N.03 / J.13 (FR-NET-1).
-- ---------------------------------------------------------------------------
CREATE TABLE relationship (
    id                uuid PRIMARY KEY,
    submission_id     uuid REFERENCES submission (id) ON DELETE CASCADE,
    source_actor_id   uuid REFERENCES actor (id),
    target_actor_id   uuid REFERENCES actor (id),
    target_name       varchar(255),
    target_actor_type integer,
    target_level      integer,
    relation_types    text,
    frequency         integer,
    rating            integer,
    support_type      integer,
    origin_field      varchar(16) NOT NULL,
    created_at        timestamptz NOT NULL
);
CREATE INDEX relationship_source_idx ON relationship (source_actor_id);
CREATE INDEX relationship_target_idx ON relationship (target_actor_id);

-- ---------------------------------------------------------------------------
-- Programmes / projects (K.08, L.11, M.07) (FR-NET-1, IND-16).
-- ---------------------------------------------------------------------------
CREATE TABLE programme (
    id                  uuid PRIMARY KEY,
    submission_id       uuid REFERENCES submission (id) ON DELETE CASCADE,
    actor_id            uuid REFERENCES actor (id),
    name                varchar(255) NOT NULL,
    thematic_area       varchar(64),
    districts           text,
    beneficiaries_men   integer,
    beneficiaries_women integer,
    funding_source      varchar(255),
    budget_usd          numeric(16, 2),
    start_date          date,
    end_date            date,
    origin_field        varchar(16) NOT NULL,
    created_at          timestamptz NOT NULL
);
CREATE INDEX programme_actor_idx ON programme (actor_id);
CREATE INDEX programme_thematic_idx ON programme (thematic_area);

-- ---------------------------------------------------------------------------
-- Photos and files (0.11 and others) (FR-MOB-5).
-- ---------------------------------------------------------------------------
CREATE TABLE attachment (
    id            uuid PRIMARY KEY,
    submission_id uuid        NOT NULL REFERENCES submission (id) ON DELETE CASCADE,
    field         varchar(16) NOT NULL,
    file_path     text        NOT NULL,
    mime          varchar(80),
    size_bytes    bigint,
    checksum      varchar(128),
    created_at    timestamptz NOT NULL
);
CREATE INDEX attachment_submission_idx ON attachment (submission_id);

-- ---------------------------------------------------------------------------
-- Automated QC results (BR-QC) (FR-QC-1).
-- ---------------------------------------------------------------------------
CREATE TABLE qc_flag (
    id            uuid PRIMARY KEY,
    submission_id uuid        NOT NULL REFERENCES submission (id) ON DELETE CASCADE,
    rule_id       varchar(16) NOT NULL,
    severity      varchar(8)  NOT NULL,
    message       varchar(500),
    resolved      boolean     NOT NULL DEFAULT false,
    resolved_by   varchar(160),
    resolved_at   timestamptz,
    created_at    timestamptz NOT NULL,
    CONSTRAINT qc_flag_severity_chk CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH'))
);
CREATE INDEX qc_flag_submission_idx ON qc_flag (submission_id);

-- ---------------------------------------------------------------------------
-- Field-level review comments (FR-QC-3).
-- ---------------------------------------------------------------------------
CREATE TABLE review_comment (
    id            uuid PRIMARY KEY,
    submission_id uuid         NOT NULL REFERENCES submission (id) ON DELETE CASCADE,
    field         varchar(16),
    comment       text         NOT NULL,
    author        varchar(160) NOT NULL,
    status        varchar(16),
    created_at    timestamptz  NOT NULL
);
CREATE INDEX review_comment_submission_idx ON review_comment (submission_id);
