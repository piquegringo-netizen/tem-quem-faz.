interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: 'md' | 'lg' | 'sm';
}

export default function Avatar({ name, photoUrl, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
  const sizeClass = size === 'lg' ? 'h-24 w-24 text-3xl' : size === 'sm' ? 'h-14 w-14 text-lg' : 'h-20 w-20 text-2xl';

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`Foto de ${name}`}
        loading="lazy"
        className={`shrink-0 rounded-full object-cover ring-4 ring-white shadow-soft ${sizeClass}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-mustard to-mustard-dark font-display text-ink ring-4 ring-white shadow-soft ${sizeClass}`}
    >
      {initials}
    </div>
  );
}
