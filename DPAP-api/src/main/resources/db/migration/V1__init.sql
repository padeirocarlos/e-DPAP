-- DPAP schema: PostGIS, administrative hierarchy, users, actors.
CREATE EXTENSION IF NOT EXISTS postgis;

-- Administrative geography (Province is implicit: Maputo).
CREATE TABLE district (
    code varchar(16) PRIMARY KEY,
    name varchar(80) NOT NULL
);

CREATE TABLE administrative_post (
    code          varchar(24) PRIMARY KEY,
    district_code varchar(16) NOT NULL REFERENCES district (code),
    name          varchar(80) NOT NULL
);

CREATE TABLE locality (
    code                     varchar(24) PRIMARY KEY,
    administrative_post_code varchar(24) NOT NULL REFERENCES administrative_post (code),
    name                     varchar(80) NOT NULL
);

CREATE TABLE app_user (
    id            uuid PRIMARY KEY,
    name          varchar(160) NOT NULL,
    email         varchar(160) NOT NULL UNIQUE,
    password_hash varchar(100) NOT NULL,
    role          varchar(32)  NOT NULL,
    enabled       boolean      NOT NULL DEFAULT true,
    created_at    timestamptz  NOT NULL,
    updated_at    timestamptz  NOT NULL,
    CONSTRAINT app_user_role_chk CHECK (role IN ('ADMINISTRATOR', 'EDITOR', 'VIEWER'))
);

CREATE TABLE actor (
    id                       uuid PRIMARY KEY,
    name                     varchar(160)     NOT NULL,
    registration_number      varchar(60),
    actor_type               varchar(40)      NOT NULL,
    legal_status             varchar(20)      NOT NULL,
    sector                   varchar(20)      NOT NULL,
    district_code            varchar(16)      NOT NULL REFERENCES district (code),
    administrative_post_code varchar(24)      NOT NULL REFERENCES administrative_post (code),
    locality_code            varchar(24)      REFERENCES locality (code),
    latitude                 double precision NOT NULL,
    longitude                double precision NOT NULL,
    responsible_person       varchar(160),
    phone                    varchar(32),
    email                    varchar(160),
    address                  varchar(240),
    sync_status              varchar(16)      NOT NULL DEFAULT 'SYNCED',
    version                  bigint           NOT NULL DEFAULT 0,
    created_at               timestamptz      NOT NULL,
    updated_at               timestamptz      NOT NULL,
    created_by               varchar(160),
    updated_by               varchar(160),
    -- DB-maintained PostGIS point derived from lon/lat (SRID 4326, geography).
    geom geography(Point, 4326) GENERATED ALWAYS AS
        (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED,
    CONSTRAINT actor_type_chk CHECK (actor_type IN (
        'PRODUCER', 'PRODUCER_ASSOCIATION', 'LIVESTOCK_PRODUCER', 'FISHERIES_ACTOR',
        'AQUACULTURE_ACTOR', 'NGO', 'INTERNATIONAL_ORGANIZATION', 'COOPERATION_AGENCY',
        'RESEARCH_INSTITUTION', 'EDUCATIONAL_INSTITUTION', 'PRIVATE_COMPANY',
        'PUBLIC_INSTITUTION')),
    CONSTRAINT actor_sector_chk CHECK (sector IN (
        'AGRICULTURE', 'LIVESTOCK', 'FISHERIES', 'AQUACULTURE')),
    CONSTRAINT actor_legal_chk CHECK (legal_status IN (
        'INDIVIDUAL', 'ASSOCIATION', 'COOPERATIVE', 'COMPANY', 'PUBLIC', 'NGO', 'INFORMAL')),
    CONSTRAINT actor_sync_chk CHECK (sync_status IN ('SYNCED', 'PENDING', 'CONFLICT')),
    CONSTRAINT actor_lat_chk CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT actor_lon_chk CHECK (longitude BETWEEN -180 AND 180)
);

CREATE INDEX actor_geom_gix ON actor USING GIST (geom);
CREATE INDEX actor_district_idx ON actor (district_code);
CREATE INDEX actor_sector_idx ON actor (sector);
CREATE INDEX actor_type_idx ON actor (actor_type);
CREATE INDEX actor_name_lower_idx ON actor (lower(name));
CREATE INDEX actor_created_at_idx ON actor (created_at);
CREATE UNIQUE INDEX actor_registration_uq
    ON actor (registration_number) WHERE registration_number IS NOT NULL;
