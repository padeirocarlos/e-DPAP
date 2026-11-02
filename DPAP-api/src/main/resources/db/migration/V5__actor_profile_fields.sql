-- BRD Module 0 / A / I — richer all-actor profile. All optional (nullable).
-- select_multiple fields are stored as comma-separated code lists (text); see
-- StringListConverter.
ALTER TABLE actor
    ADD COLUMN acronym                 varchar(255),
    ADD COLUMN respondent_sex          varchar(16),
    ADD COLUMN respondent_age          integer,
    ADD COLUMN respondent_education    varchar(24),
    ADD COLUMN phone_alt               varchar(32),
    ADD COLUMN website                 varchar(255),
    ADD COLUMN subsectors              text,
    ADD COLUMN value_chain_links       text,
    ADD COLUMN operation_level         varchar(24),
    ADD COLUMN districts_of_operation  text,
    ADD COLUMN legal_formality         varchar(24),
    ADD COLUMN registration_docs       text,
    ADD COLUMN nuit                    varchar(9),
    ADD COLUMN consent                 boolean,
    ADD COLUMN contact_sharing_consent boolean,
    ADD COLUMN funding_sources         text,
    ADD COLUMN received_credit         boolean;
