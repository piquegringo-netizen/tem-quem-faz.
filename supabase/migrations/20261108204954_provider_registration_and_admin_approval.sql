/*
# Provider registration and admin approval

1. New Tables
- `admins`: accounts allowed to open the admin panel. Starts empty; the owner adds accounts here.

2. New Functions
- `is_admin()`: true when the signed-in user is listed in `admins`.
- `submit_provider(...)`: validates a registration and saves it as pending. Anyone can call it.

3. Security
- `admins` has RLS enabled and no grants to public roles.
- Visitors cannot insert into `providers` directly; they must use `submit_provider`, which always creates the provider with status pending.
- Admins can read all providers and their categories, and can change only the `status` column of a provider.
- Public search still shows only approved providers.

4. Seed data
- Three pending registrations and one rejected registration for testing.

5. Notes
- Every statement is idempotent so the migration can be re-applied safely.
*/

CREATE TABLE IF NOT EXISTS admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_provider(
  p_name text,
  p_whatsapp text,
  p_city_id uuid,
  p_category_id uuid,
  p_headline text,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city cities%ROWTYPE;
  v_provider_id uuid;
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

  SELECT * INTO v_city FROM cities WHERE id = p_city_id AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escolha uma cidade disponível.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM categories WHERE id = p_category_id) THEN
    RAISE EXCEPTION 'Escolha uma categoria válida.';
  END IF;

  INSERT INTO providers (city_id, name, headline, description, whatsapp, status, latitude, longitude)
  VALUES (v_city.id, trim(p_name), trim(p_headline), trim(p_description), p_whatsapp, 'pendente',
          v_city.latitude, v_city.longitude)
  RETURNING id INTO v_provider_id;

  INSERT INTO provider_categories (provider_id, category_id)
  VALUES (v_provider_id, p_category_id);

  RETURN v_provider_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_provider(text, text, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_provider(text, text, uuid, uuid, text, text) TO anon, authenticated;

DROP POLICY IF EXISTS "admin_read_all_providers" ON providers;
CREATE POLICY "admin_read_all_providers" ON providers FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_provider_status" ON providers;
CREATE POLICY "admin_update_provider_status" ON providers FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT UPDATE (status) ON providers TO authenticated;

DROP POLICY IF EXISTS "admin_read_provider_categories" ON provider_categories;
CREATE POLICY "admin_read_provider_categories" ON provider_categories FOR SELECT
  TO authenticated USING (public.is_admin());

INSERT INTO providers (id, city_id, name, headline, description, whatsapp, plan, status, latitude, longitude) VALUES
  ('b0000000-0000-4000-8000-000000000013', 'c0000000-0000-4000-8000-000000000001', 'Caio Monteiro', 'Reformas e reboco', 'Reboco, assentamento de piso e pequenas reformas em casas e lajes.', '5533998110013', NULL, 'pendente', -18.5560, -41.5030),
  ('b0000000-0000-4000-8000-000000000014', 'c0000000-0000-4000-8000-000000000002', 'Ana Paula Ribeiro', 'Faxina para casas e escritórios', 'Limpeza semanal e pós-obra, com produtos próprios e horário flexível.', '5533998120014', NULL, 'pendente', -19.7880, -42.1400),
  ('b0000000-0000-4000-8000-000000000015', 'c0000000-0000-4000-8000-000000000001', 'Rodrigo Teixeira', 'Chaveiro 24 horas', 'Abertura de portas, cópia de chaves e troca de fechaduras, inclusive à noite.', '5533998110015', NULL, 'pendente', -18.5510, -41.5000),
  ('b0000000-0000-4000-8000-000000000016', 'c0000000-0000-4000-8000-000000000001', 'Gustavo Ferraz', 'Encanador', 'Reparos hidráulicos e desentupimentos.', '5533998110016', NULL, 'recusado', -18.5490, -41.5070)
ON CONFLICT (id) DO NOTHING;

INSERT INTO provider_categories (provider_id, category_id) VALUES
  ('b0000000-0000-4000-8000-000000000013', 'ca000000-0000-4000-8000-000000000005'),
  ('b0000000-0000-4000-8000-000000000014', 'ca000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000015', 'ca000000-0000-4000-8000-000000000007'),
  ('b0000000-0000-4000-8000-000000000016', 'ca000000-0000-4000-8000-000000000002')
ON CONFLICT DO NOTHING;
