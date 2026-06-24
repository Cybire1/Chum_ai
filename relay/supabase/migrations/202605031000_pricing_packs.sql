-- Add Growth and Scale credit packs.
-- Original version of this migration only supplied public_id and skipped
-- pack_id (NOT NULL), so it broke on fresh installs. The old DB happened
-- to pass because the runtime bootstrap seeder filled the same rows
-- first. Fix: write both columns, conflict on pack_id (which is unique
-- and is what later migrations key off).
INSERT INTO huru_credit_packs (public_id, pack_id, name, amount_minor, currency, credits_awarded)
VALUES
  ('cpk_credits_300',  'credits_300',  'Growth Top-Up', 30000,  'NGN', 5000),
  ('cpk_credits_1000', 'credits_1000', 'Scale Top-Up',  100000, 'NGN', 25000)
ON CONFLICT (pack_id) DO NOTHING;
