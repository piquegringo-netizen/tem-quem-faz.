interface CategoryChipsProps {
  categories: string[];
  active: string | null;
  onChange: (category: string | null) => void;
}

export default function CategoryChips({ categories, active, onChange }: CategoryChipsProps) {
  const items: (string | null)[] = [null, ...categories];

  return (
    <div
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      role="group"
      aria-label="Filtrar por categoria"
    >
      {items.map((category) => {
        const isActive = category === active;
        return (
          <button
            key={category ?? 'todos'}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(category)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition active:scale-95 ${
              isActive
                ? 'bg-petrol text-paper shadow-soft'
                : 'bg-white text-ink/80 shadow-soft ring-1 ring-ink/5 hover:text-petrol'
            }`}
          >
            {category ?? 'Todos'}
          </button>
        );
      })}
    </div>
  );
}
