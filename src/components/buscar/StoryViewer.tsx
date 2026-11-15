import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { StoryWithProvider } from '@/types/marketplace';

interface StoryViewerProps {
  stories: StoryWithProvider[];
  startIndex: number;
  onClose: () => void;
}

const STORY_DURATION = 5000;

export default function StoryViewer({ stories, startIndex, onClose }: StoryViewerProps) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const story = stories[index];

  useEffect(() => {
    setProgress(0);
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 100;
        }
        return prev + 100 / (STORY_DURATION / 50);
      });
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [index]);

  useEffect(() => {
    if (progress >= 100) {
      if (index < stories.length - 1) {
        setIndex((prev) => prev + 1);
      } else {
        onClose();
      }
    }
  }, [progress, index, stories.length, onClose]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' && index < stories.length - 1) setIndex((prev) => prev + 1);
      if (event.key === 'ArrowLeft' && index > 0) setIndex((prev) => prev - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, stories.length, onClose]);

  if (!story) return null;

  function goPrev() {
    if (index > 0) setIndex((prev) => prev - 1);
  }

  function goNext() {
    if (index < stories.length - 1) setIndex((prev) => prev + 1);
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink">
      <div className="flex gap-1.5 px-3 pt-3" aria-hidden="true">
        {stories.map((item, i) => (
          <div key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white">{story.providerName}</span>
          <span className="text-xs text-white/60">{story.providerHeadline}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar story"
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {story.mediaType === 'video' ? (
          <video
            src={story.mediaUrl}
            className="max-h-full max-w-full object-contain"
            autoPlay
            muted
            playsInline
          />
        ) : (
          <img
            src={story.mediaUrl}
            alt={story.caption ?? `Story de ${story.providerName}`}
            className="max-h-full max-w-full object-contain"
          />
        )}

        {story.caption && (
          <p className="absolute bottom-8 left-0 right-0 px-6 text-center text-lg font-medium text-white drop-shadow-lg">
            {story.caption}
          </p>
        )}

        <button
          type="button"
          onClick={goPrev}
          aria-label="Story anterior"
          disabled={index === 0}
          className="absolute left-0 top-0 flex h-full w-1/3 cursor-default items-start justify-start disabled:opacity-0"
        >
          {index > 0 && (
            <ChevronLeft className="m-2 h-8 w-8 text-white/70" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="Próximo story"
          className="absolute right-0 top-0 flex h-full w-1/3 cursor-default items-start justify-end"
        >
          <ChevronRight className="m-2 h-8 w-8 text-white/70" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
