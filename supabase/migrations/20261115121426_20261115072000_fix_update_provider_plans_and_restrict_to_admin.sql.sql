/*
# Fix seal update function and restrict seals to admin

1. What this does (plain English)
- Fixes the crash when saving seals: the function referenced a type
  (`plan_type`) that does not exist. Now it writes plain text values.
- Seals are no longer changed by providers. Only the admin (signed in on the
  Painel) can add or remove a provider's seals.

2. Changes
- `update_provider_plans(...)`: rewritten. When called by a signed-in admin
  (checked via the existing `is_admin()` function), it updates the given
  provider's seals. There is no anonymous path to change seals anymore.
- The display column `plan` is recalculated as the highest selected seal.

3. Security
- Anonymous callers can no longer modify seals; the function raises unless
  `is_admin()` is true.
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
BEGIN
  IF NOT COALESCE(public.is_admin(), false) THEN
    RAISE EXCEPTION 'Apenas o administrador pode alterar os selos.';
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
        WHEN 'regiao' = ANY(v_plans) THEN 'regiao'
        WHEN 'cidade' = ANY(v_plans) THEN 'cidade'
        WHEN 'bairro' = ANY(v_plans) THEN 'bairro'
        ELSE NULL
      END
  WHERE id = p_provider_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não encontramos este cadastro.';
  END IF;

  RETURN v_plans;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_provider_plans(uuid, text, text[]) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_provider_plans(uuid, text, text[]) FROM PUBLIC;