/*
# Make registration fee optional for WhatsApp payment flow

1. Modified Functions
- `submit_provider(...)`: the registration fee parameter now defaults to true and the hard block
  ("taxa precisa ser paga") was removed. Payment is now confirmed manually by the admin via WhatsApp,
  so the database no longer rejects unpaid submissions — they are saved as pending and the admin
  approves only after checking the payment.
- The old 8-argument version (without plans) remains removed; only this new version exists.

2. Notes
- `registration_fee_paid` keeps being recorded as a flag the admin can check, but is no longer required.
- Idempotent: safe to re-apply.
*/

CREATE OR REPLACE FUNCTION public.submit_provider(
  p_name text,
  p_whatsapp text,
  p_city_id uuid,
  p_category_id uuid,
  p_headline text,
  p_description text,
  p_selected_plans text[] DEFAULT NULL,
  p_registration_fee_paid boolean DEFAULT true
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

  INSERT INTO providers (city_id, name, headline, description, whatsapp, status, latitude, longitude,
                         selected_plans, registration_fee_paid)
  VALUES (v_city.id, trim(p_name), trim(p_headline), trim(p_description), p_whatsapp, 'pendente',
          v_city.latitude, v_city.longitude, v_plans, p_registration_fee_paid)
  RETURNING id INTO v_provider_id;

  INSERT INTO provider_categories (provider_id, category_id)
  VALUES (v_provider_id, p_category_id);

  RETURN v_provider_id;
END;
$$;
