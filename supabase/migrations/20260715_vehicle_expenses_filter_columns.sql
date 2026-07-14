-- ═══════════════════════════════════════════════════════════════════════════
-- Add the vidange filter-tracking columns to vehicle_expenses.
-- ═══════════════════════════════════════════════════════════════════════════
-- Symptom this fixes:
--   Saving a vehicle expense failed with a 400 error:
--     POST /rest/v1/vehicle_expenses → 400
--     { code: 'PGRST204',
--       message: "Could not find the 'ac_filter_changed' column of
--                 'vehicle_expenses' in the schema cache" }
--   The app writes oil/air/fuel/ac_filter_changed for vidange expenses, but the
--   production database was created before these columns existed.
--
-- The app now degrades gracefully (it retries the write without these columns
-- when they are missing), but running this migration restores full vidange
-- filter tracking. Apply it in the Supabase SQL editor of the project the
-- deployed app points to.
-- ---------------------------------------------------------------------------

alter table public.vehicle_expenses
  add column if not exists oil_filter_changed  boolean not null default false;
alter table public.vehicle_expenses
  add column if not exists air_filter_changed  boolean not null default false;
alter table public.vehicle_expenses
  add column if not exists fuel_filter_changed boolean not null default false;
alter table public.vehicle_expenses
  add column if not exists ac_filter_changed   boolean not null default false;

-- Ask PostgREST to reload its schema cache immediately so the new columns are
-- usable without waiting for the periodic reload.
notify pgrst, 'reload schema';
