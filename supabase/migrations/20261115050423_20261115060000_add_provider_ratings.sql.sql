/*
# Add public provider ratings

1. What this does (plain English)
- Adds real star ratings to provider profiles. A visitor can choose 1 to 5
  stars without creating an account.
- The same browser uses one reviewer key per provider, so changing a rating
  updates that visitor's previous rating instead of inflating the count.
- Every rating recalculates the provider's average and total atomically.

2. New table `provider_ratings`
- `id` (uuid, primary key)
- `provider_id` (uuid, provider being rated)
- `reviewer_key` (text, anonymous browser identifier)
- `rating` (smallint, restricted to 1 through 5)
- `created_at` (timestamptz)
- Unique `(provider_id, reviewer_key)` prevents duplicate ratings from one
  browser for the same provider.

3. Security
- RLS is enabled with no direct public table grants; visitors can only rate
  through the controlled RPC.
- `submit_provider_rating(...)` is a SECURITY DEFINER function exposed to
  anon/authenticated because the app intentionally has no sign-in screen.
  It validates the provider, rating, and reviewer key before writing.
*/

CREATE TABLE IF NOT EXISTS public.provider_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  reviewer_key text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_ratings_provider_reviewer_key UNIQUE (provider_id, reviewer_key),
  CONSTRAINT provider_ratings_reviewer_key_check CHECK (reviewer_key ~ '^[0-9a-fA-F-]{36}$')
);

CREATE INDEX IF NOT EXISTS provider_ratings_provider_idx
  ON public.provider_ratings (provider_id);

ALTER TABLE public.provider_ratings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.submit_provider_rating(
  p_provider_id uuid,
  p_reviewer_key text,
  p_rating smallint
)
RETURNS TABLE(rating_avg numeric, rating_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
IF NOT EXISTS (
  SELECT 1 FROM providers WHERE id = p_provider_id AND status = 'aprovado'
) THEN
RAISE EXCEPTION 'Prestador não encontrado.';
END IF;
IF p_reviewer_key IS NULL OR p_reviewer_key !~ '^[0-9a-fA-F-]{36}$' THEN
RAISE EXCEPTION 'Identificador de avaliação inválido.';
END IF;
IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
RAISE EXCEPTION 'Escolha uma nota entre 1 e 5.';
END IF;

INSERT INTO provider_ratings (provider_id, reviewer_key, rating)
VALUES (p_provider_id, p_reviewer_key, p_rating)
ON CONFLICT (provider_id, reviewer_key)
DO UPDATE SET rating = EXCLUDED.rating, created_at = now();

UPDATE providers
SET rating_avg = COALESCE((SELECT round(avg(rating)::numeric, 2) FROM provider_ratings WHERE provider_id = p_provider_id), 0),
    rating_count = (SELECT count(*)::integer FROM provider_ratings WHERE provider_id = p_provider_id)
WHERE id = p_provider_id;

RETURN QUERY
SELECT p.rating_avg, p.rating_count
FROM providers p
WHERE p.id = p_provider_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_provider_rating(uuid, text, smallint) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_provider_rating(uuid, text, smallint) FROM PUBLIC;