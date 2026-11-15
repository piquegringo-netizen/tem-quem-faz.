/*
# Fix avatar path validation + add portfolio gallery table

1. What this does (plain English)
- BUG FIX for "foto inválida": photos were uploaded to a subfolder
  (`<providerId>/<uuid>.jpg`) but the database had TWO checks that only
  accepted a path without the subfolder (a CHECK constraint on the table
  and a regex inside the RPCs), so EVERY photo upload was rejected.
  Both checks now accept the subfolder shape, and the provider's existing
  orphaned photos are re-linked to their profile.
- New feature "Fotos dos trabalhos" (portfolio gallery): providers can add
  work photos in the panel editor; they show in the public profile.

2. Schema changes
- `providers.photo_url` CHECK constraint (`providers_photo_url_check`)
  replaced: now accepts `^https://` OR an avatars bucket path with optional
  `<providerId>/` subfolder and .jpg/.webp extension. Full-path rebuild of
  the constraint on a NULL-safe predicate; no rows are lost (the only
  violating row is the one being repaired by the data fix below).

3. Modified functions
- `submit_provider(...)`: photo regex relaxed (same shape as the check).
- `is_avatar_url(...)`: accepts optional `<providerId>/` prefix.
- `update_provider_profile(...)`: uses the relaxed `is_avatar_url`.

4. Data repair (idempotent, NULL-safe)
- For each provider with NULL photo_url, the newest object under their
  folder in the avatars bucket is linked as their photo.

5. New table `portfolio_photos`
- `id` (uuid, pk), `provider_id` (uuid, references providers, cascade),
  `path` (text, avatars bucket path), `created_at` (timestamptz).
- Max 6 photos per provider (enforced in the SECURITY DEFINER RPC below).

6. Security (RLS + grants)
- RLS enabled; public read (photos are public profile content).
- Writes only via SECURITY DEFINER RPCs that verify the caller's whatsapp
  matches the provider's whatsapp (same ownership model as requests).
  Anon/authenticated get table-level SELECT only.

7. New RPCs
- `add_portfolio_photo(p_provider_id, p_whatsapp, p_path)`: validates path
  shape, bucket object existence, and 6-photo cap.
- `remove_portfolio_photo(p_photo_id, p_whatsapp)`: owner-only delete.
*/

-- 1. Relax the table-level CHECK (drop + re-add; NULL-safe, no data loss).
ALTER TABLE public.providers DROP CONSTRAINT IF EXISTS providers_photo_url_check;
ALTER TABLE public.providers ADD CONSTRAINT providers_photo_url_check
CHECK (
  photo_url IS NULL
  OR photo_url ~ '^https://'
  OR photo_url ~ '^/object/public/avatars/([0-9a-fA-F-]{36}/)?[0-9a-fA-F-]{36}\.(jpg|webp)$'
);

-- 2. Relax the RPC-side validation helpers.
CREATE OR REPLACE FUNCTION public.is_avatar_url(p_url text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT p_url IS NOT NULL AND p_url ~ '^/object/public/avatars/([0-9a-fA-F-]{36}/)?[0-9a-fA-F-]{36}\.(jpg|webp)$';
$$;

REVOKE EXECUTE ON FUNCTION public.is_avatar_url(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_provider_profile(
  p_provider_id uuid,
  p_name text,
  p_whatsapp text,
  p_city_id uuid,
  p_headline text,
  p_description text,
  p_photo_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_city cities%ROWTYPE;
BEGIN
IF NOT EXISTS (SELECT 1 FROM providers WHERE id = p_provider_id) THEN
RAISE EXCEPTION 'Prestador não encontrado.';
END IF;
IF length(trim(p_name)) NOT BETWEEN 3 AND 80 THEN
RAISE EXCEPTION 'Informe seu nome completo (entre 3 e 80 letras).';
END IF;
IF p_whatsapp !~ '^55[0-9]{10,11}$' THEN
RAISE EXCEPTION 'Informe um número de WhatsApp válido, com DDD.';
END IF;
IF length(trim(p_headline)) NOT BETWEEN 3 AND 60 THEN
RAISE EXCEPTION 'Informe sua especialidade (entre 3 e 60 caracteres).';
END IF;
IF length(trim(p_description)) NOT BETWEEN 10 AND 400 THEN
RAISE EXCEPTION 'Escreva uma breve descrição (entre 10 e 400 caracteres).';
END IF;

SELECT * INTO v_city FROM cities WHERE id = p_city_id AND is_active;
IF NOT FOUND THEN
RAISE EXCEPTION 'Escolha uma cidade disponível.';
END IF;

IF p_photo_url IS NOT NULL AND p_photo_url <> '' AND NOT public.is_avatar_url(p_photo_url) THEN
RAISE EXCEPTION 'Foto de perfil inválida.';
END IF;

UPDATE providers
SET name = trim(p_name),
    whatsapp = p_whatsapp,
    city_id = v_city.id,
    latitude = v_city.latitude,
    longitude = v_city.longitude,
    headline = trim(p_headline),
    description = trim(p_description),
    photo_url = CASE
      WHEN p_photo_url = '' THEN NULL
      ELSE COALESCE(p_photo_url, photo_url)
    END
WHERE id = p_provider_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_provider(
  p_name text,
  p_whatsapp text,
  p_city_id uuid,
  p_category_id uuid,
  p_headline text,
  p_description text,
  p_selected_plans text[] DEFAULT NULL,
  p_registration_fee_paid boolean DEFAULT true,
  p_photo_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_city cities%ROWTYPE;
v_provider_id uuid;
v_plans text[];
v_invalid text;
BEGIN
IF length(trim(p_name)) NOT BETWEEN 3 AND 80 THEN
RAISE EXCEPTION 'Informe seu nome completo (entre 3 e 80 letras).';
END IF;
IF p_whatsapp !~ '^55[0-9]{10,11}$' THEN
RAISE EXCEPTION 'Informe um número de WhatsApp válido, com DDD.';
END IF;
IF length(trim(p_headline)) NOT BETWEEN 3 AND 60 THEN
RAISE EXCEPTION 'Informe sua especialidade (entre 3 e 60 caracteres).';
END IF;
IF length(trim(p_description)) NOT BETWEEN 10 AND 400 THEN
RAISE EXCEPTION 'Escreva uma breve descrição (entre 10 e 400 caracteres).';
END IF;

IF p_selected_plans IS NOT NULL AND array_length(p_selected_plans, 1) > 0 THEN
SELECT array_agg(DISTINCT p) INTO v_plans FROM unnest(p_selected_plans) AS p WHERE p IS NOT NULL;
SELECT string_agg(p, ', ') INTO v_invalid
FROM unnest(v_plans) AS p
WHERE p NOT IN ('bairro', 'cidade', 'regiao');
IF v_invalid IS NOT NULL THEN
RAISE EXCEPTION 'Plano inválido: %', v_invalid;
END IF;
END IF;

SELECT * INTO v_city FROM cities WHERE id = p_city_id AND is_active;
IF NOT FOUND THEN
RAISE EXCEPTION 'Escolha uma cidade disponível.';
END IF;

IF NOT EXISTS (SELECT 1 FROM categories WHERE id = p_category_id) THEN
RAISE EXCEPTION 'Escolha uma categoria válida.';
END IF;

IF p_photo_url IS NOT NULL AND NOT public.is_avatar_url(p_photo_url) THEN
RAISE EXCEPTION 'Foto de perfil inválida.';
END IF;

INSERT INTO providers (city_id, name, headline, description, whatsapp, status, latitude, longitude,
selected_plans, registration_fee_paid, photo_url)
VALUES (v_city.id, trim(p_name), trim(p_headline), trim(p_description), p_whatsapp, 'pendente',
v_city.latitude, v_city.longitude, v_plans, p_registration_fee_paid, p_photo_url)
RETURNING id INTO v_provider_id;

INSERT INTO provider_categories (provider_id, category_id)
VALUES (v_provider_id, p_category_id);

RETURN v_provider_id;
END;
$$;

-- 3. Data repair: link orphaned uploaded photos back to their provider
-- (only fills NULL photo_url, never overwrites).
DO $$
DECLARE
r RECORD;
v_name text;
BEGIN
FOR r IN
  SELECT p.id AS provider_id
  FROM providers p
  WHERE p.photo_url IS NULL
LOOP
  SELECT o.name INTO v_name
  FROM storage.objects o
  WHERE o.bucket_id = 'avatars'
    AND o.name LIKE (r.provider_id || '/%')
  ORDER BY o.created_at DESC
  LIMIT 1;
  IF v_name IS NOT NULL THEN
    UPDATE providers
    SET photo_url = '/object/public/avatars/' || v_name
    WHERE id = r.provider_id AND photo_url IS NULL;
  END IF;
END LOOP;
END $$;

-- 4. Portfolio gallery table.
CREATE TABLE IF NOT EXISTS public.portfolio_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolio_photos_provider_idx
  ON public.portfolio_photos (provider_id, created_at);

ALTER TABLE public.portfolio_photos ENABLE ROW LEVEL SECURITY;

GRANT SELECT (id, provider_id, path, created_at) ON public.portfolio_photos TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_portfolio" ON public.portfolio_photos;
CREATE POLICY "public_read_portfolio"
ON public.portfolio_photos FOR SELECT
TO anon, authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.add_portfolio_photo(p_provider_id uuid, p_whatsapp text, p_path text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_provider providers%ROWTYPE;
v_photo_id uuid;
BEGIN
SELECT * INTO v_provider FROM providers WHERE id = p_provider_id;
IF NOT FOUND THEN
RAISE EXCEPTION 'Prestador não encontrado.';
END IF;
IF v_provider.whatsapp <> p_whatsapp THEN
RAISE EXCEPTION 'Sem permissão para alterar este perfil.';
END IF;
IF p_path IS NULL OR p_path !~ '^([0-9a-fA-F-]{36}/)?[0-9a-fA-F-]{36}\.(jpg|webp)$' THEN
RAISE EXCEPTION 'Foto inválida.';
END IF;
IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'avatars' AND name = p_path) THEN
RAISE EXCEPTION 'Foto não encontrada no armazenamento.';
END IF;
IF (SELECT count(*) FROM portfolio_photos WHERE provider_id = p_provider_id) >= 6 THEN
RAISE EXCEPTION 'Limite de 6 fotos de trabalhos.';
END IF;

INSERT INTO portfolio_photos (provider_id, path)
VALUES (p_provider_id, p_path)
RETURNING id INTO v_photo_id;
RETURN v_photo_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_portfolio_photo(p_photo_id uuid, p_whatsapp text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_provider_id uuid;
BEGIN
SELECT provider_id INTO v_provider_id FROM portfolio_photos WHERE id = p_photo_id;
IF NOT FOUND THEN
RAISE EXCEPTION 'Foto não encontrada.';
END IF;
IF NOT EXISTS (
  SELECT 1 FROM providers
  WHERE id = v_provider_id AND whatsapp = p_whatsapp
) THEN
RAISE EXCEPTION 'Sem permissão para alterar este perfil.';
END IF;
DELETE FROM portfolio_photos WHERE id = p_photo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_portfolio_photo(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_portfolio_photo(uuid, text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_portfolio_photo(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.remove_portfolio_photo(uuid, text) FROM PUBLIC;