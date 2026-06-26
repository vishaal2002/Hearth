-- Add a "where" to moments: a free-text place plus its geocoded coordinates.
-- The text is what a person typed ("Verona, Italy"); lat/lng are filled in once
-- (via geocoding on save) so the Map view can drop a pin without re-geocoding.
alter table public.moments
  add column if not exists location text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;
