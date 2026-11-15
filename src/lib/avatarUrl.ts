const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/** Resolves both legacy full paths and raw Storage object paths. */
export function avatarSrc(photoPath: string | null | undefined): string | undefined {
  if (!photoPath) return undefined;
  if (photoPath.startsWith('http')) return photoPath;
  if (photoPath.startsWith('/object/public/')) return `${SUPABASE_URL}/storage/v1${photoPath}`;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${photoPath.replace(/^\/+/, '')}`;
}
