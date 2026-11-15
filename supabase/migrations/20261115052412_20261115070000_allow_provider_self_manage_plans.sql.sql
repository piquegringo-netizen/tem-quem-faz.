/*
# Let providers manage their own seals (selected plans)

1. What this does (plain English)
- Providers can now change their seals (Selo Bairro / Cidade / Região) from the
  app's Painel, without asking an admin.
- Identity without login is proven the same way as the rest of the app: the
  caller must pass the WhatsApp number already stored on the provider row.

2. New function `update_provider_plans`
- Params: provider id, whatsapp (55 + digits), list of plan ids.
- Validates ownership (whatsapp must match the row), validates each plan value
  ('bairro', 'cidade', 'regiao'), deduplicates, and writes `selected_plans`.
- Also updates the display column `plan` to the highest selected seal (null
  when none), so stamps and the featured carousel reflect the change.
- SECURITY DEFINER with fixed search_path; executable by anon/authenticated
  because the app intentionally has no sign-in screen.

3. Security
- No direct table grants are added; writes go through this function only.
- Re-runnable: CREATE OR REPLACE + idempotent grants.
*/

CREATE OR REPLACE FUNCTION public.update_provider_plans(
  p_provider_id uuid,
  p_whatsapp text,
  p_selected_plans text[]
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plans text[];
  v_invalid text;
  v_highest text;
BEGIN
  IF p_whatsapp IS NULL OR p_whatsapp !~ '^55[0-9]{10,11}$' THEN
    RAISE EXCEPTION 'Número de WhatsApp inválido.';
  END IF;

  SELECT array_agg(DISTINCT p) INTO v_plans
  FROM unnest(p_selected_plans) AS p
  WHERE p IS NOT NULL;

  IF v_plans IS NOT NULL THEN
    SELECT string_agg(p, ', ') INTO v_invalid
    FROM unnest(v_plans) AS p
    WHERE p NOT IN ('bairro', 'cidade', 'regiao');
    IF v_invalid IS NOT NULL THEN
      RAISE EXCEPTION 'Plano inválido: %', v_invalid;
    END IF;
  END IF;

  UPDATE providers
  SET selected_plans = v_plans,
      plan = CASE
        WHEN 'regiao' = ANY(v_plans) THEN 'regiao'::plan_type
        WHEN 'cidade' = ANY(v_plans) THEN 'cidade'::plan_type
        WHEN 'bairro' = ANY(v_plans) THEN 'bairro'::plan_type
        ELSE NULL
      END
  WHERE id = p_provider_id AND whatsapp = p_whatsapp;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não encontramos seu cadastro com esse WhatsApp.';
  END IF;

  RETURN v_plans;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_provider_plans(uuid, text, text[]) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_provider_plans(uuid, text, text[]) FROM PUBLIC;