ALTER TABLE personas
  ADD COLUMN bio_transcript   TEXT,
  ADD COLUMN bio_structured   JSON,
  ADD COLUMN bio_recorded_at  DATETIME;
