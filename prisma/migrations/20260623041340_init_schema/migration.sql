-- Enable btree_gist extension required for the tstzrange exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent overlapping venue reservations for booked status
ALTER TABLE "venue_reservations"
  ADD CONSTRAINT "venue_no_overlap"
  EXCLUDE USING gist (
    tstzrange("starts_at", "ends_at") WITH &&
  ) WHERE (status = 'booked');
