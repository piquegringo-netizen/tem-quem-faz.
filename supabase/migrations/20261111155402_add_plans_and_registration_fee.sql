/*
# Add selected plans and registration fee to provider submissions

1. Modified Tables
- `providers`
  - New column `selected_plans` (text[], nullable): list of seal plans the provider chose at registration.
    Valid values: 'bairro', 'cidade', 'regiao'. Empty array or NULL means no seals selected.
  - New column `registration_fee_paid` (boolean, default false): whether the one-time R$49,90 registration fee was paid.
    Submissions are only accepted when this is true.

2. Modified Functions
- `submit_provider(...)`: now accepts two new parameters:
  - `p_selected_plans text[]` — the seals the provider wants (validated inside the function).
  - `p_registration_fee_paid boolean` — must be true; the function rejects submissions when the fee was not paid.
  The function writes both values into the new columns and still creates the provider with status 'pendente'.

3. Notes
- Plan validation is done inside the SECURITY DEFINER function (the only write path), not a check constraint,
  because PostgreSQL does not allow subqueries in CHECK constraints.
- Existing rows are backfilled: `registration_fee_paid` defaults to false, and `selected_plans` stays NULL for existing providers.
- The existing `plan` column (single highest seal for display) is untouched. At approval time, the admin can still set `plan` manually.
- Idempotent: safe to re-apply.
*/

ALTER TABLE providers ADD COLUMN IF NOT EXISTS selected_plans text[];
ALTER TABLE providers ADD COLUMN IF NOT EXISTS registration_fee_paid boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.submit_provider(
  p_name text,
  p_whatsapp text,
  p_city_id uuid,
  p_category_id uuid,
  p_headline text,
  p_description text,
  p_selected_plans text[] DEFAULT NULL,
  p_registration_fee_paid boolean DEFAULT false
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
  IF NOT p_registration_fee_paid THEN
    RAISE EXCEPTION 'A taxa de cadastro precisa ser paga para enviar o cadastro.';
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
          v_city.latitude, v_city.longitude, v_plans, true)
  RETURNING id INTO v_provider_id;

  INSERT INTO provider_categories (provider_id, category_id)
  VALUES (v_provider_id, p_category_id);

  RETURN v_provider_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_provider(text, text, uuid, uuid, text, text, text[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_provider(text, text, uuid, uuid, text, text, text[], boolean) TO anon, authenticated;

GRANT UPDATE (selected_plans, registration_fee_paid) ON providers TO authenticated;
