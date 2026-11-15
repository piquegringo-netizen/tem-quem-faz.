import { Hammer } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-petrol text-paper shadow-soft">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mustard text-ink">
          <Hammer className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex min-w-0 items-baseline gap-2.5">
          <p className="font-display text-lg uppercase leading-none tracking-wider">Tem Quem Faz</p>
          <p className="hidden truncate text-xs text-paper/70 sm:block">Precisou? Tem quem faz.</p>
        </div>
      </div>
    </header>
  );
}
