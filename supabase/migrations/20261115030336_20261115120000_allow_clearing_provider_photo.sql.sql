/*
# Allow clearing the provider profile photo

1. What this does (plain English)
- The provider profile editor has a "Remover" button for the photo. Until now,
  saving without a photo kept the old one in the database (COALESCE kept the
  previous URL). This update makes the editor able to actually remove the
  photo: when the frontend sends an empty photo URL, the column is cleared.

2. Modified functions
- `update_provider_profile(...)`: empty string for p_photo_url now clears
  photo_url; a real URL still validates against the avatars bucket shape;
  NULL keeps the current photo (no change).

3. Security
- No policy or grant changes; same EXECUTE grants as before.
*/

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