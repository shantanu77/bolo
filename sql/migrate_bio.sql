ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS bio_transcript   TEXT,
  ADD COLUMN IF NOT EXISTS bio_structured   JSON,
  ADD COLUMN IF NOT EXISTS bio_recorded_at  DATETIME;
