import { Star } from 'lucide-react';
import { formatRating } from '@/lib/format';

interface StarRatingProps {
  value: number;
  count: number;
}

const STARS = [0, 1, 2, 3, 4];

export default function StarRating({ value, count }: StarRatingProps) {
  const percent = Math.min(Math.max(value / 5, 0), 1) * 100;

  return (
    <div className="flex items-center gap-1.5" aria-label={`Nota ${formatRating(value)} de 5`}>
      <span className="relative inline-flex">
        <span className="flex gap-0.5 text-ink/15">
          {STARS.map((star) => (
            <Star key={star} className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          ))}
        </span>
        <span className="absolute inset-y-0 left-0 overflow-hidden text-mustard-dark" style={{ width: `${percent}%` }}>
          <span className="flex w-max gap-0.5">
            {STARS.map((star) => (
              <Star key={star} className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            ))}
          </span>
        </span>
      </span>
      <span className="font-mono text-xs font-medium text-ink">{formatRating(value)}</span>
      <span className="font-mono text-xs text-ink/55">({count})</span>
    </div>
  );
}
