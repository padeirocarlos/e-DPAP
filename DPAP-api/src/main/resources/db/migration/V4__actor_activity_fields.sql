-- Richer "actor activity" detail: free-text notes, when the activity started,
-- how it is funded, and a reference to a photo. All optional (nullable) so
-- existing records remain valid.
ALTER TABLE actor
    ADD COLUMN description   text,
    ADD COLUMN observations  text,
    ADD COLUMN start_date     date,
    ADD COLUMN funding_type   varchar(32),
    ADD COLUMN image_url      varchar(512);
