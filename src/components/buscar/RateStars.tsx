import { useState } from 'react';
import { Star } from 'lucide-react';
import { submitProviderRating } from '@/services/ratings';

interface RateStarsProps {
  providerId: string;
  ratingAvg: number;
  ratingCount: number;
  onRated: (ratingAvg: number, ratingCount: number) => void;
}

export default function RateStars({ providerId, ratingAvg, ratingCount, onRated }: RateStarsProps) {
  const [hovered, setHovered] = useState(0);
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  const handleRate = async (rating: number) => {
    if (status === 'saving') return;
    setStatus('saving');
    try {
      const result = await submitProviderRating(providerId, rating);
      onRated(result.ratingAvg, result.ratingCount);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="rounded-2xl bg-white px-4 py-4 shadow-soft">
      <p className="text-sm font-semibold text-ink">Avalie este profissional</p>
      <p className="mt-0.5 text-xs text-ink/60">
        {status === 'done'
          ? 'Obrigado! Sua avaliação foi registrada.'
          : status === 'error'
            ? 'Não foi possível salvar sua avaliação. Tente novamente.'
            : 'Toque nas estrelas para dar sua nota.'}
      </p>
      <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="Escolha sua nota">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={hovered === star}
            aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
            disabled={status === 'saving'}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => void handleRate(star)}
            className="rounded-full p-0.5 transition disabled:opacity-60"
          >
            <Star
              className={`h-7 w-7 transition ${
                star <= hovered ? 'scale-110 fill-mustard text-mustard-dark' : 'fill-ink/10 text-ink/25'
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      {status === 'done' && (
        <p className="mt-1 font-mono text-xs text-ink/70">
          Nota atual: {ratingAvg.toFixed(1).replace('.', ',')} com {ratingCount} avaliações
        </p>
      )}
    </div>
  );
}
