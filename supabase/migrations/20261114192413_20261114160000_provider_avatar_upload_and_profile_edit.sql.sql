/*
# Provider photo upload, self-service profile editing, Manicure category

1. What this does (plain English)
- Enables providers to upload a profile photo and to edit their own profile
  (name, headline, city, description, whatsapp) after registration.
- Photos are stored in a public Storage bucket "avatars", max 2MB per file;
  the browser resizes to max 500x500 before upload.
- Adds the "Manicure" category to the profession list.

2. Storage
- Creates the public bucket "avatars" (idempotent via ON CONFLICT).
- Policies: anyone (anon + authenticated) can READ (photos are public
  profile pictures). Upload/replace into the avatars bucket is allowed for
  anon + authenticated because provider registration is public (no client
  login); file size (2MB) and type (png/jpeg/webp) are enforced by the
  bucket settings themselves.

3. Table changes
- No new columns: the existing `providers.photo_url` column is now used.
- INSERT INTO categories: "Manicure" (slug manicure, sort_order 9), idempotent.
- No destructive changes.

4. New/changed RPCs (SECURITY DEFINER, validation server-side)
- `submit_provider(..., p_photo_url text DEFAULT NULL)`: extended with an
  optional photo URL; validates it points into the avatars bucket.
- `provider_by_whatsapp(p_whatsapp text)`: returns the provider matched by
  full whatsapp (55 + digits), used by the "Meu perfil" screen. Pending
  providers can also see their own profile while awaiting approval.
- `update_provider_profile(p_provider_id, p_name, p_whatsapp, p_city_id,
  p_headline, p_description, p_photo_url DEFAULT NULL)`: validates all
  fields server-side and updates the provider row.
- `is_avatar_url(p_url text)`: internal helper for photo URL validation.

5. Security
- RLS stays enabled on all tables; no new permissive table policies.
- All writes go through the RPCs above, which validate lengths, formats,
  active city, and photo URL shape.
- Grants: EXECUTE on the public RPCs to anon, authenticated (revoked from
  PUBLIC); the internal helper is not executable by anon/authenticated.
*/

-- 1) Storage bucket (public read, 2MB limit, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- Anyone can view avatars (public profile photos)
DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects;
CREATE POLICY "public_read_avatars"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

-- Uploads allowed into avatars (public app, no client login);
-- size/type are enforced by the bucket settings above.
DROP POLICY IF EXISTS "public_upload_avatars" ON storage.objects;
CREATE POLICY "public_upload_avatars"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "public_replace_avatars" ON storage.objects;
CREATE POLICY "public_replace_avatars"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- 2) New category: Manicure
INSERT INTO categories (id, slug, name, sort_order)
VALUES ('ca000000-0000-4000-8000-000000000009', 'manicure', 'Manicure', 9)
ON CONFLICT (id) DO UPDATE SET slug = 'manicure', name = 'Manicure', sort_order = 9;

-- 3) Extend submit_provider with an optional photo URL
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

IF p_photo_url IS NOT NULL AND p_photo_url !~ '^/object/public/avatars/[0-9a-fA-F-]{36}\.[a-z]{3,4}$' THEN
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

-- 4) Internal helper: validate a photo URL points into the avatars bucket
CREATE OR REPLACE FUNCTION public.is_avatar_url(p_url text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT p_url IS NOT NULL AND p_url ~ '^/object/public/avatars/[0-9a-fA-F-]{36}\.[a-z]{3,4}$';
$$;

REVOKE EXECUTE ON FUNCTION public.is_avatar_url(text) FROM PUBLIC, anon, authenticated;

-- 5) Find own profile by whatsapp (55 + digits)
CREATE OR REPLACE FUNCTION public.provider_by_whatsapp(p_whatsapp text)
RETURNS TABLE (
  id uuid,
  name text,
  headline text,
  description text,
  whatsapp text,
  city_id uuid,
  photo_url text,
  status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT pr.id, pr.name, pr.headline, pr.description, pr.whatsapp,
       pr.city_id, pr.photo_url, pr.status
FROM providers pr
WHERE pr.whatsapp = p_whatsapp
LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.provider_by_whatsapp(text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.provider_by_whatsapp(text) FROM PUBLIC;

-- 6) Update own profile (validates everything server-side)
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

IF p_photo_url IS NOT NULL AND NOT public.is_avatar_url(p_photo_url) THEN
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
    photo_url = COALESCE(p_photo_url, photo_url)
WHERE id = p_provider_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_provider_profile(uuid, text, text, uuid, text, text, text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_provider_profile(uuid, text, text, uuid, text, text, text) FROM PUBLIC;