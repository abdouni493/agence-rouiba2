-- =============================================================================
--  Migration — add the reservation columns the front-end writes on create
-- -----------------------------------------------------------------------------
--  The `reservations` table was missing a few columns that
--  ReservationsService.createReservation() sends, which made the POST fail with
--  400 (Bad Request):
--    price_per_day, price_week, price_month  → price snapshot at reservation time
--    caution_currency                        → 'DZD' | 'EUR'
--    assurance_enabled, assurance_percentage → legacy percentage-based assurance
--
--  The app already tolerates their absence (it retries the insert without them),
--  so this migration is OPTIONAL — run it only if you want that data persisted.
--
--  How to apply: Supabase Dashboard → SQL Editor → paste → Run.
-- =============================================================================

alter table public.reservations
  add column if not exists price_per_day        numeric,
  add column if not exists price_week           numeric,
  add column if not exists price_month          numeric,
  add column if not exists caution_currency     text default 'DZD',
  add column if not exists assurance_enabled     boolean default false,
  add column if not exists assurance_percentage numeric;

-- Tell PostgREST to refresh its schema cache so the new columns are usable now.
notify pgrst, 'reload schema';
