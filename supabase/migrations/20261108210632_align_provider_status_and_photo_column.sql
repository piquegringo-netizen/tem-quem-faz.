/*
# Align provider status values and add profile photo column

1. Modified Tables
- `providers`
  - New column `photo_url` (text, nullable): link to the profile photo. Empty until photo upload is enabled.
  - Status value `recusado` is renamed to `rejeitado`. Allowed statuses are now: `pendente`, `aprovado`, `rejeitado`.

2. Notes
- The table keeps its name `providers` and existing columns; nothing is renamed or dropped, so existing data, policies and the public search are unaffected.
- Existing rows with `recusado` are converted to `rejeitado` before the new constraint is added.
- Idempotent: safe to re-apply.
*/

ALTER TABLE providers ADD COLUMN IF NOT EXISTS photo_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'providers_photo_url_check' AND conrelid = 'providers'::regclass
  ) THEN
    ALTER TABLE providers ADD CONSTRAINT providers_photo_url_check
      CHECK (photo_url IS NULL OR photo_url ~ '^https://');
  END IF;
END $$;

ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_status_check;

UPDATE providers SET status = 'rejeitado' WHERE status = 'recusado';

ALTER TABLE providers ADD CONSTRAINT providers_status_check
  CHECK (status IN ('pendente', 'aprovado', 'rejeitado'));
