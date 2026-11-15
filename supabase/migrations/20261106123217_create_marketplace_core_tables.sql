/*
# Marketplace core: cities, categories, providers, engagement tracking

1. New Tables
- `cities`: launch cities (name, state, map coordinates used to measure distance, active flag).
- `categories`: service categories such as Eletricista, Encanador, Diarista.
- `providers`: service professionals with name, specialty, description, WhatsApp number, badge plan (bairro, cidade, regiao), rating summary, tags, portfolio photos and approval status.
- `provider_categories`: which categories each provider offers.
- `profile_views`: one row each time someone opens a provider profile.
- `contact_clicks`: one row each time someone presses the WhatsApp button.

2. Security
- Row level security enabled on every table.
- Cities (active only), categories, provider categories and approved providers are readable by anonymous and signed-in visitors.
- Pending or rejected providers are never visible to the public.
- Anyone can record a profile view or contact click, but only for approved providers. These logs cannot be read directly.
- `provider_weekly_stats` returns view and contact totals for the last 7 days for one provider.
- Public roles have no write access to the catalog tables.

3. Seed data
- Launch city Poté (MG), plus Caratinga (MG) and Mantena (MG) to prepare for more cities.
- Twelve fictional providers in Portuguese for testing, with a few profile views seeded for the last 7 days.

4. Notes
- Every statement is idempotent so the migration can be re-applied safely.
- Seed rows use fixed identifiers so they are the same on every rebuild.
*/

CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  uf char(2) NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text UNIQUE NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name text NOT NULL,
  headline text NOT NULL,
  description text NOT NULL,
  whatsapp text NOT NULL CHECK (whatsapp ~ '^55[0-9]{10,11}$'),
  plan text CHECK (plan IN ('bairro', 'cidade', 'regiao')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  rating_avg numeric(2,1) NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  portfolio_urls text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS providers_city_status_idx ON providers (city_id, status);

CREATE TABLE IF NOT EXISTS provider_categories (
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (provider_id, category_id)
);

CREATE TABLE IF NOT EXISTS profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_views_provider_idx ON profile_views (provider_id, created_at);

CREATE TABLE IF NOT EXISTS contact_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_clicks_provider_idx ON contact_clicks (provider_id, created_at);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_clicks ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON cities, categories, providers, provider_categories TO anon, authenticated;
GRANT INSERT ON profile_views, contact_clicks TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_active_cities" ON cities;
CREATE POLICY "public_read_active_cities" ON cities FOR SELECT
  TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_approved_providers" ON providers;
CREATE POLICY "public_read_approved_providers" ON providers FOR SELECT
  TO anon, authenticated USING (status = 'aprovado');

DROP POLICY IF EXISTS "public_read_approved_provider_categories" ON provider_categories;
CREATE POLICY "public_read_approved_provider_categories" ON provider_categories FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM providers p WHERE p.id = provider_categories.provider_id AND p.status = 'aprovado'
  ));

DROP POLICY IF EXISTS "public_log_profile_view" ON profile_views;
CREATE POLICY "public_log_profile_view" ON profile_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers p WHERE p.id = profile_views.provider_id AND p.status = 'aprovado'
  ));

DROP POLICY IF EXISTS "public_log_contact_click" ON contact_clicks;
CREATE POLICY "public_log_contact_click" ON contact_clicks FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM providers p WHERE p.id = contact_clicks.provider_id AND p.status = 'aprovado'
  ));

CREATE OR REPLACE FUNCTION public.provider_weekly_stats(p_provider_id uuid)
RETURNS TABLE (views bigint, contacts bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM profile_views v
      WHERE v.provider_id = p_provider_id AND v.created_at >= now() - interval '7 days'),
    (SELECT count(*) FROM contact_clicks c
      WHERE c.provider_id = p_provider_id AND c.created_at >= now() - interval '7 days');
$$;

REVOKE EXECUTE ON FUNCTION public.provider_weekly_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provider_weekly_stats(uuid) TO anon, authenticated;

INSERT INTO cities (id, slug, name, uf, latitude, longitude, is_active) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'pote-mg', 'Poté', 'MG', -18.5500, -41.5000, true),
  ('c0000000-0000-4000-8000-000000000002', 'caratinga-mg', 'Caratinga', 'MG', -19.7896, -42.1397, true),
  ('c0000000-0000-4000-8000-000000000003', 'mantena-mg', 'Mantena', 'MG', -18.8155, -40.8856, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, slug, name, sort_order) VALUES
  ('ca000000-0000-4000-8000-000000000001', 'eletricista', 'Eletricista', 1),
  ('ca000000-0000-4000-8000-000000000002', 'encanador', 'Encanador', 2),
  ('ca000000-0000-4000-8000-000000000003', 'diarista', 'Diarista', 3),
  ('ca000000-0000-4000-8000-000000000004', 'pintor', 'Pintor', 4),
  ('ca000000-0000-4000-8000-000000000005', 'pedreiro', 'Pedreiro', 5),
  ('ca000000-0000-4000-8000-000000000006', 'jardineiro', 'Jardineiro', 6),
  ('ca000000-0000-4000-8000-000000000007', 'chaveiro', 'Chaveiro', 7),
  ('ca000000-0000-4000-8000-000000000008', 'marceneiro', 'Marceneiro', 8)
ON CONFLICT (id) DO NOTHING;

INSERT INTO providers (id, city_id, name, headline, description, whatsapp, plan, status, latitude, longitude, rating_avg, rating_count, tags, portfolio_urls) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Carlos Eduardo Lima', 'Eletricista residencial', 'Instalações, troca de disjuntores e reparos em quadros de luz, com atendimento rápido e orçamento sem compromisso.', '5533998110001', 'regiao', 'aprovado', -18.5530, -41.4980, 4.9, 38, ARRAY['Atende hoje', 'Emergência 24h'], ARRAY['https://images.pexels.com/photos/7937305/pexels-photo-7937305.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/32497160/pexels-photo-32497160.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/3615735/pexels-photo-3615735.jpeg?auto=compress&cs=tinysrgb&h=650&w=940']),
  ('b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Marta Rocha', 'Diarista de confiança', 'Limpeza de rotina e pesada, com produtos e materiais próprios. Atendo casas e apartamentos.', '5533998110002', 'cidade', 'aprovado', -18.5480, -41.5040, 4.8, 21, ARRAY['Atende hoje'], ARRAY['https://images.pexels.com/photos/5591651/pexels-photo-5591651.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/5591482/pexels-photo-5591482.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/6197046/pexels-photo-6197046.jpeg?auto=compress&cs=tinysrgb&h=650&w=940']),
  ('b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'Jorge Batista', 'Pintor e pequenos reparos', 'Pintura interna e externa, texturas e pequenos reparos em alvenaria. Trabalho limpo e prazo combinado.', '5533998110003', 'bairro', 'aprovado', -18.5600, -41.5120, 4.6, 12, ARRAY[]::text[], ARRAY['https://images.pexels.com/photos/5583116/pexels-photo-5583116.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/5583052/pexels-photo-5583052.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/5583126/pexels-photo-5583126.jpeg?auto=compress&cs=tinysrgb&h=650&w=940']),
  ('b0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 'Paulo Henrique Souza', 'Encanador de plantão', 'Reparos hidráulicos, desentupimento e pequenas reformas de banheiro e cozinha.', '5533998110004', 'cidade', 'aprovado', -18.5510, -41.4950, 4.7, 17, ARRAY['Emergência 24h'], ARRAY['https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/29226620/pexels-photo-29226620.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/16509869/pexels-photo-16509869.jpeg?auto=compress&cs=tinysrgb&h=650&w=940']),
  ('b0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001', 'Fernanda Gomes', 'Pintura residencial', 'Pintura residencial e comercial com acabamento caprichado e proteção de móveis.', '5533998110005', NULL, 'aprovado', -18.5450, -41.5010, 4.9, 9, ARRAY[]::text[], ARRAY['https://images.pexels.com/photos/5583126/pexels-photo-5583126.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/5583116/pexels-photo-5583116.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/5583052/pexels-photo-5583052.jpeg?auto=compress&cs=tinysrgb&h=650&w=940']),
  ('b0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000001', 'Roberto Martins', 'Jardins e paisagismo', 'Manutenção de jardins, poda de árvores e paisagismo para casas e pequenos condomínios.', '5533998110006', 'bairro', 'aprovado', -18.5620, -41.5070, 4.5, 8, ARRAY[]::text[], ARRAY['https://images.pexels.com/photos/38936338/pexels-photo-38936338.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/24595771/pexels-photo-24595771.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/38936350/pexels-photo-38936350.jpeg?auto=compress&cs=tinysrgb&h=650&w=940']),
  ('b0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000001', 'Anderson Pires', 'Chaveiro e marceneiro', 'Abertura de portas, troca de fechaduras e móveis sob medida para sua casa.', '5533998110007', 'regiao', 'aprovado', -18.5580, -41.4990, 4.8, 27, ARRAY['Emergência 24h', 'Atende hoje'], ARRAY['https://images.pexels.com/photos/3615735/pexels-photo-3615735.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/7937305/pexels-photo-7937305.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/32497160/pexels-photo-32497160.jpeg?auto=compress&cs=tinysrgb&h=650&w=940']),
  ('b0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000001', 'Lúcia Ferreira', 'Faxina e organização', 'Faxina de rotina, limpeza pós-festa e organização de armários e cozinha.', '5533998110008', NULL, 'aprovado', -18.5470, -41.5060, 4.4, 6, ARRAY[]::text[], ARRAY['https://images.pexels.com/photos/5591482/pexels-photo-5591482.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/5591651/pexels-photo-5591651.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/6197046/pexels-photo-6197046.jpeg?auto=compress&cs=tinysrgb&h=650&w=940']),
  ('b0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000001', 'Sérgio Alves', 'Pedreiro para pequenas obras', 'Construção de muros, reboco, assentamento de piso e reparos em alvenaria.', '5533998110009', 'bairro', 'pendente', -18.5390, -41.5100, 4.3, 5, ARRAY[]::text[], ARRAY['https://images.pexels.com/photos/5583052/pexels-photo-5583052.jpeg?auto=compress&cs=tinysrgb&h=650&w=940']),
  ('b0000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000002', 'Thiago Nogueira', 'Elétrica e hidráulica', 'Serviços elétricos e hidráulicos de emergência, com atendimento em todo o centro da cidade.', '5533998120010', 'regiao', 'aprovado', -19.7920, -42.1380, 4.8, 30, ARRAY['Emergência 24h'], ARRAY['https://images.pexels.com/photos/7937305/pexels-photo-7937305.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/32497160/pexels-photo-32497160.jpeg?auto=compress&cs=tinysrgb&h=650&w=940']),
  ('b0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000002', 'Patrícia Mendes', 'Jardinagem e varandas', 'Cuidado de jardins, varandas e hortas caseiras, com visitas semanais.', '5533998120011', NULL, 'aprovado', -19.7850, -42.1420, 4.7, 11, ARRAY['Atende hoje'], ARRAY['https://images.pexels.com/photos/24595771/pexels-photo-24595771.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/38936338/pexels-photo-38936338.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/38936350/pexels-photo-38936350.jpeg?auto=compress&cs=tinysrgb&h=650&w=940']),
  ('b0000000-0000-4000-8000-000000000012', 'c0000000-0000-4000-8000-000000000003', 'Joana Santos', 'Pintura de fachadas', 'Pintura de fachadas e interiores, com proteção e acabamento para o clima da região.', '5533998130012', 'bairro', 'aprovado', -18.8170, -40.8870, 4.6, 14, ARRAY[]::text[], ARRAY['https://images.pexels.com/photos/5583126/pexels-photo-5583126.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/5583052/pexels-photo-5583052.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/5583116/pexels-photo-5583116.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO provider_categories (provider_id, category_id) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000002', 'ca000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000003', 'ca000000-0000-4000-8000-000000000004'),
  ('b0000000-0000-4000-8000-000000000003', 'ca000000-0000-4000-8000-000000000005'),
  ('b0000000-0000-4000-8000-000000000004', 'ca000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000005', 'ca000000-0000-4000-8000-000000000004'),
  ('b0000000-0000-4000-8000-000000000006', 'ca000000-0000-4000-8000-000000000006'),
  ('b0000000-0000-4000-8000-000000000007', 'ca000000-0000-4000-8000-000000000007'),
  ('b0000000-0000-4000-8000-000000000007', 'ca000000-0000-4000-8000-000000000008'),
  ('b0000000-0000-4000-8000-000000000008', 'ca000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000009', 'ca000000-0000-4000-8000-000000000005'),
  ('b0000000-0000-4000-8000-000000000010', 'ca000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000010', 'ca000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000011', 'ca000000-0000-4000-8000-000000000006'),
  ('b0000000-0000-4000-8000-000000000012', 'ca000000-0000-4000-8000-000000000004')
ON CONFLICT DO NOTHING;

INSERT INTO profile_views (provider_id, created_at)
SELECT p.id, now() - random() * interval '7 days'
FROM providers p
CROSS JOIN LATERAL generate_series(1, 5 + floor(random() * 25)::int) AS g
WHERE NOT EXISTS (SELECT 1 FROM profile_views);
