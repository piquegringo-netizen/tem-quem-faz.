/*
# Create stories table for provider stories

1. New Tables
- `stories`
  - `id` (uuid, primary key)
  - `provider_id` (uuid, FK to providers ON DELETE CASCADE)
  - `media_url` (text, not null): URL of the story photo or video
  - `media_type` (text, not null, default 'image'): 'image' or 'video'
  - `caption` (text, nullable): short caption shown over the story
  - `created_at` (timestamptz, default now()): used for ordering
  - `expires_at` (timestamptz, not null): when the story disappears (created_at + 24h)

2. Security
- RLS enabled on `stories`.
- Public read: anyone (anon + authenticated) can read stories that belong to approved providers and haven't expired yet. This keeps expired and unapproved-provider stories invisible.
- Admin insert: authenticated admins can insert stories for any approved provider.
- No public update or delete — stories are managed by the admin for now.

3. Seed data
- Stories for several approved providers using Pexels photo URLs.
- All seed stories have a far-future expiry (365 days) so demo data remains visible during development.

4. Notes
- Real stories inserted later get the default 24h expiry.
- Idempotent: safe to re-apply.
*/

CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS stories_provider_idx ON stories(provider_id);
CREATE INDEX IF NOT EXISTS stories_expires_idx ON stories(expires_at DESC);

GRANT SELECT ON stories TO anon, authenticated;
GRANT INSERT ON stories TO authenticated;

DROP POLICY IF EXISTS "public_read_active_stories" ON stories;
CREATE POLICY "public_read_active_stories" ON stories FOR SELECT
  TO anon, authenticated
  USING (
    expires_at > now()
    AND EXISTS (
      SELECT 1 FROM providers p
      WHERE p.id = stories.provider_id AND p.status = 'aprovado'
    )
  );

DROP POLICY IF EXISTS "admin_insert_stories" ON stories;
CREATE POLICY "admin_insert_stories" ON stories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

INSERT INTO stories (id, provider_id, media_url, media_type, caption, created_at, expires_at) VALUES
  ('a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001',
   'https://images.pexels.com/photos/8040633/pexels-photo-8040633.jpeg?auto=compress&w=800',
   'image', 'Terminando mais uma instalação!', now() - interval '2 hours',
   now() + interval '365 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stories (id, provider_id, media_url, media_type, caption, created_at, expires_at) VALUES
  ('a0000000-0000-4000-8000-000000000002',
   'b0000000-0000-4000-8000-000000000002',
   'https://images.pexels.com/photos/8961065/pexels-photo-8961065.jpeg?auto=compress&w=800',
   'image', 'Reforma completa na cozinha', now() - interval '5 hours',
   now() + interval '365 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stories (id, provider_id, media_url, media_type, caption, created_at, expires_at) VALUES
  ('a0000000-0000-4000-8000-000000000003',
   'b0000000-0000-4000-8000-000000000004',
   'https://images.pexels.com/photos/4239035/pexels-photo-4239035.jpeg?auto=compress&w=800',
   'image', 'Pintura nova, casa renovada', now() - interval '1 hour',
   now() + interval '365 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stories (id, provider_id, media_url, media_type, caption, created_at, expires_at) VALUES
  ('a0000000-0000-4000-8000-000000000004',
   'b0000000-0000-4000-8000-000000000005',
   'https://images.pexels.com/photos/8961342/pexels-photo-8961342.jpeg?auto=compress&w=800',
   'image', 'Mais um serviço bem feito', now() - interval '30 minutes',
   now() + interval '365 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stories (id, provider_id, media_url, media_type, caption, created_at, expires_at) VALUES
  ('a0000000-0000-4000-8000-000000000005',
   'b0000000-0000-4000-8000-000000000006',
   'https://images.pexels.com/photos/1668860/pexels-photo-1668860.jpeg?auto=compress&w=800',
   'image', 'Jardim novo para o final de semana', now() - interval '8 hours',
   now() + interval '365 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stories (id, provider_id, media_url, media_type, caption, created_at, expires_at) VALUES
  ('a0000000-0000-4000-8000-000000000006',
   'b0000000-0000-4000-8000-000000000008',
   'https://images.pexels.com/photos/8961069/pexels-photo-8961069.jpeg?auto=compress&w=800',
   'image', 'Móvel sob medida pronto', now() - interval '3 hours',
   now() + interval '365 days')
ON CONFLICT (id) DO NOTHING;
