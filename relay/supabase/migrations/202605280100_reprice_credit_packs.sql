-- Reprice credit packs: flat pricing at ~3x markup on Economy-tier upstream cost.
-- Updates old pack rows in-place so historical credit_purchases FK references remain valid.
-- The 5th legacy pack (pack_25000) is renamed to pack_legacy_25000 — kept for history,
-- not exposed in the UI. A future migration can prune it once its purchases are archived.

UPDATE huru_credit_packs
  SET pack_id = 'pack_starter',
      name = 'Starter',
      amount_minor = 280000,
      currency = 'NGN',
      credits_awarded = 1000
  WHERE pack_id = 'pack_100';

UPDATE huru_credit_packs
  SET pack_id = 'pack_pro',
      name = 'Pro',
      amount_minor = 1260000,
      currency = 'NGN',
      credits_awarded = 5000
  WHERE pack_id = 'pack_300';

UPDATE huru_credit_packs
  SET pack_id = 'pack_business',
      name = 'Business',
      amount_minor = 4900000,
      currency = 'NGN',
      credits_awarded = 25000
  WHERE pack_id = 'pack_1400';

UPDATE huru_credit_packs
  SET pack_id = 'pack_scale',
      name = 'Scale',
      amount_minor = 13860000,
      currency = 'NGN',
      credits_awarded = 100000
  WHERE pack_id = 'pack_5000';

UPDATE huru_credit_packs
  SET pack_id = 'pack_legacy_25000',
      name = 'Scale (legacy)'
  WHERE pack_id = 'pack_25000';

-- Insert any packs missing (idempotent for fresh installs).
-- Provide public_id explicitly so the INSERT branch is valid on
-- fresh databases. On existing rows the ON CONFLICT DO UPDATE
-- preserves the existing public_id (not in the SET list).
INSERT INTO huru_credit_packs (public_id, pack_id, name, amount_minor, currency, credits_awarded)
VALUES
  ('cpk_pack_starter',  'pack_starter',  'Starter',  280000,   'NGN', 1000),
  ('cpk_pack_pro',      'pack_pro',      'Pro',      1260000,  'NGN', 5000),
  ('cpk_pack_business', 'pack_business', 'Business', 4900000,  'NGN', 25000),
  ('cpk_pack_scale',    'pack_scale',    'Scale',    13860000, 'NGN', 100000)
ON CONFLICT (pack_id) DO UPDATE SET
  name = EXCLUDED.name,
  amount_minor = EXCLUDED.amount_minor,
  currency = EXCLUDED.currency,
  credits_awarded = EXCLUDED.credits_awarded;
