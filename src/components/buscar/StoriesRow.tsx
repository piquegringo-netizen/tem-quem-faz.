import Avatar from '@/components/ui/Avatar';
import type { StoryWithProvider } from '@/types/marketplace';

interface StoriesRowProps {
  stories: StoryWithProvider[];
  onOpen: (startIndex: number) => void;
}

export default function StoriesRow({ stories, onOpen }: StoriesRowProps) {
  if (stories.length === 0) return null;

  return (
    <section aria-label="Stories" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-4 pb-1">
        {stories.map((story, index) => (
          <li key={story.id} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpen(index)}
              aria-label={`Ver story de ${story.providerName}`}
              className="rounded-full bg-gradient-to-br from-mustard to-rust p-0.5 transition hover:scale-105 active:scale-95"
            >
              <span className="flex h-[64px] w-[64px] items-center justify-center rounded-full border-2 border-paper">
                <Avatar name={story.providerName} size="sm" />
              </span>
            </button>
            <span className="max-w-[60px] truncate text-[11px] font-medium text-ink/60">
              {story.providerName.split(' ')[0]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
