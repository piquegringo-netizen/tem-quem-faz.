/*
# Secure profile edits and choose the newest WhatsApp profile

1. What this does (plain English)
- Profile edits now require the current WhatsApp number already stored on the
  provider record. Knowing a provider ID alone is no longer enough to change
  their name, phone, city, description, or photo.
- When a WhatsApp number has more than one provider record, the profile lookup
  consistently returns the newest registration instead of an arbitrary row.

2. Modified functions
- `update_provider_profile(...)`: adds `p_current_whatsapp` and checks it
  against the existing provider row before updating.
- `provider_by_whatsapp(...)`: orders by newest `created_at` before LIMIT 1.

3. Security
- The profile edit function remains available to anon/authenticated because
  this app intentionally has no sign-in screen. Ownership is enforced by the
  current WhatsApp check inside the SECURITY DEFINER function.
- The previous 7-argument function is removed so it cannot bypass the check.
*/

DROP FUNCTION IF EXISTS public.update_provider_profile(uuid, text, text, uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.update_provider_profile(
  p_provider_id uuid,
  p_current_whatsapp text,
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
v_provider providers%ROWTYPE;
BEGIN
SELECT * INTO v_provider
FROM providers
WHERE id = p_provider_id
  AND whatsapp = p_current_whatsapp;
IF NOT FOUND THEN
RAISE EXCEPTION 'Não foi possível confirmar este perfil.';
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

GRANT EXECUTE ON FUNCTION public.update_provider_profile(uuid, text, text, text, uuid, text, text, text)
  TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_provider_profile(uuid, text, text, text, uuid, text, text, text)
  FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.provider_by_whatsapp(p_whatsapp text)
RETURNS TABLE(
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
ORDER BY pr.created_at DESC
LIMIT 1;
$$;