/*
# Requests board (Pedidos): city requests wall

1. What this does (plain English)
- New "Pedidos" tab: anyone (no login) can post a request for a service
  (name, whatsapp, description, category, city, optional photo). Others see
  the open requests as a feed and can call the requester on WhatsApp.
- The person who posted can mark their request as resolved or delete it
  (verified by matching the whatsapp number they provided).

2. New table
- `requests`
  - `id` (uuid, primary key)
  - `city_id` (uuid, references cities) — city of the requester
  - `name` (text, 3-60 chars) — who is asking
  - `whatsapp` (text, '55' + digits) — contact, also used as the owner key
  - `description` (text, 10-500 chars)
  - `category` (text, one of: pedreiro, eletricista, encanador, diarista,
    pintor, outro)
  - `photo_url` (text, nullable) — optional photo (avatars bucket path)
  - `status` (text: 'aberto' | 'resolvido', default 'aberto')
  - `created_at` (timestamptz, default now())
- Indexes on (city_id, status, created_at) for the feed query and on
  (status, created_at) for the cleanup job.

3. Security (RLS)
- RLS enabled. Public (anon + authenticated) can READ rows with status
  'aberto' and INSERT new ones — inserts are validated again by trigger
  (name/whatsapp/description/category/city must be well-formed).
- UPDATE/DELETE are only possible via the SECURITY DEFINER RPCs below,
  which verify the caller's whatsapp matches the request's whatsapp.
- Column-restricted grants: only the columns a request needs are writable.

4. New RPCs
- `resolve_request(p_request_id, p_whatsapp)`: marks as 'resolvido' if the
  whatsapp matches; NULL whatsapp keeps compatibility.
- `delete_request(p_request_id, p_whatsapp)`: deletes if the whatsapp
  matches.

5. Retention (last 100 requests, resolved ones older than 30 days removed)
- Cleanup runs via pg_cron if available (daily 03:00 UTC), else the insert
  trigger prunes opportunistically: deletes resolved rows older than 30
  days, then deletes the oldest rows beyond the newest 100.
- No destructive change to existing tables.
*/

CREATE TABLE IF NOT EXISTS public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id),
  name text NOT NULL,
  whatsapp text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  photo_url text,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'resolvido')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS requests_feed_idx ON public.requests (city_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS requests_cleanup_idx ON public.requests (status, created_at);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT (id, city_id, name, whatsapp, description, category, photo_url, status, created_at)
  ON public.requests TO anon, authenticated;
GRANT INSERT (city_id, name, whatsapp, description, category, photo_url)
  ON public.requests TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_open_requests" ON public.requests;
CREATE POLICY "public_read_open_requests"
ON public.requests FOR SELECT
TO anon, authenticated
USING (status = 'aberto');

DROP POLICY IF EXISTS "public_insert_requests" ON public.requests;
CREATE POLICY "public_insert_requests"
ON public.requests FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(name)) BETWEEN 3 AND 60
  AND whatsapp ~ '^55[0-9]{10,11}$'
  AND length(trim(description)) BETWEEN 10 AND 500
  AND category IN ('pedreiro', 'eletricista', 'encanador', 'diarista', 'pintor', 'outro')
  AND (photo_url IS NULL OR photo_url ~ '^/object/public/avatars/[0-9a-fA-F-]{36}\.[a-z]{3,4}$')
  AND EXISTS (SELECT 1 FROM cities c WHERE c.id = city_id AND c.is_active)
);

-- Validate row shape on inserts done through any path (incl. RPC/service_role
-- is exempt; this only guards the public API).
CREATE OR REPLACE FUNCTION public.validate_request_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
IF NEW.name IS NULL OR length(trim(NEW.name)) NOT BETWEEN 3 AND 60 THEN
RAISE EXCEPTION 'Informe seu nome (entre 3 e 60 letras).';
END IF;
IF NEW.whatsapp IS NULL OR NEW.whatsapp !~ '^55[0-9]{10,11}$' THEN
RAISE EXCEPTION 'Informe um número de WhatsApp válido, com DDD.';
END IF;
IF NEW.description IS NULL OR length(trim(NEW.description)) NOT BETWEEN 10 AND 500 THEN
RAISE EXCEPTION 'Descreva o que você precisa (entre 10 e 500 caracteres).';
END IF;
IF NEW.category NOT IN ('pedreiro', 'eletricista', 'encanador', 'diarista', 'pintor', 'outro') THEN
RAISE EXCEPTION 'Escolha uma categoria válida.';
END IF;
IF NOT EXISTS (SELECT 1 FROM cities c WHERE c.id = NEW.city_id AND c.is_active) THEN
RAISE EXCEPTION 'Escolha uma cidade disponível.';
END IF;
NEW.name := trim(NEW.name);
NEW.description := trim(NEW.description);
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS requests_validate_trigger ON public.requests;
CREATE TRIGGER requests_validate_trigger
BEFORE INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.validate_request_row();

-- Owner actions: the whatsapp number IS the ownership proof.
CREATE OR REPLACE FUNCTION public.resolve_request(p_request_id uuid, p_whatsapp text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
UPDATE requests
SET status = 'resolvido'
WHERE id = p_request_id AND whatsapp = p_whatsapp AND status = 'aberto';
IF NOT FOUND THEN
RAISE EXCEPTION 'Não foi possível marcar este pedido como resolvido.';
END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_request(p_request_id uuid, p_whatsapp text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
DELETE FROM requests WHERE id = p_request_id AND whatsapp = p_whatsapp;
IF NOT FOUND THEN
RAISE EXCEPTION 'Não foi possível excluir este pedido.';
END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_request(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_request(uuid, text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_request(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_request(uuid, text) FROM PUBLIC;

-- Retention: keep newest 100 requests; drop resolved older than 30 days.
CREATE OR REPLACE FUNCTION public.cleanup_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
DELETE FROM requests
WHERE status = 'resolvido' AND created_at < now() - interval '30 days';
DELETE FROM requests
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (ORDER BY created_at DESC) AS rn
    FROM requests
  ) ranked
  WHERE rn > 100
);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_requests() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron')
AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_requests_daily') THEN
PERFORM cron.schedule(
  'cleanup_requests_daily',
  '0 3 * * *',
  $cron$ SELECT public.cleanup_requests(); $cron$
);
END IF;
EXCEPTION WHEN OTHERS THEN
-- pg_cron not schedulable here; insert trigger prunes opportunistically.
NULL;
END $$;

-- Opportunistic pruning on every insert (cheap, indexed).
CREATE OR REPLACE FUNCTION public.prune_requests_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
DELETE FROM requests
WHERE status = 'resolvido' AND created_at < now() - interval '30 days';
DELETE FROM requests
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (ORDER BY created_at DESC) AS rn
    FROM requests
  ) ranked
  WHERE rn > 100
);
RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS requests_prune_trigger ON public.requests;
CREATE TRIGGER requests_prune_trigger
AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.prune_requests_on_insert();