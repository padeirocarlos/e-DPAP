-- BRD Phase 4 — support publishing an Actor from a submission.
-- (1) Add Matola, the 8th Maputo district (BRD §1.4; absent from the V2 seed),
--     so q0_06 code 5 maps to a real district.
-- (2) The questionnaire captures the administrative post as free text (0.07),
--     so an Actor published from a submission may not carry a post FK — relax it.
INSERT INTO district (code, name) VALUES ('MTL', 'Matola')
    ON CONFLICT (code) DO NOTHING;

ALTER TABLE actor ALTER COLUMN administrative_post_code DROP NOT NULL;
