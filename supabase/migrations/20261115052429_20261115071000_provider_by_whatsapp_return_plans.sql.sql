/*
# Expose current seals in the provider profile lookup

1. What this does (plain English)
- The "Meu perfil" identification by WhatsApp now also returns the provider's
  current seals (selected plans), so the Painel can show what is active and
  let the provider change them.

2. Modified function
- `provider_by_whatsapp(...)`: recreated with `selected_plans text[]` added to
  the result (the return type change required dropping the old version first).

3. Security
- Unchanged: SECURITY DEFINER with fixed search_path, callable by
  anon/authenticated (no sign-in app); returns one row for the given number.
*/

DROP FUNCTION IF EXISTS public.provider_by_whatsapp(text);

CREATE OR REPLACE FUNCTION public.provider_by_whatsapp(p_whatsapp text)
RETURNS TABLE(
  id uuid,
  name text,
  headline text,
  description text,
  whatsapp text,
  city_id uuid,
  photo_url text,
  status text,
  selected_plans text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT pr.id, pr.name, pr.headline, pr.description, pr.whatsapp,
pr.city_id, pr.photo_url, pr.status, pr.selected_plans
FROM providers pr
WHERE pr.whatsapp = p_whatsapp
ORDER BY pr.created_at DESC
LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.provider_by_whatsapp(text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.provider_by_whatsapp(text) FROM PUBLIC;