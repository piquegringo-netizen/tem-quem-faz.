import { ClipboardList, LayoutDashboard, Megaphone, Search, type LucideIcon } from 'lucide-react';

export type TabId = 'buscar' | 'pedidos' | 'anunciar' | 'painel';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'buscar', label: 'Buscar', icon: Search },
  { id: 'pedidos', label: 'Pedidos', icon: ClipboardList },
  { id: 'anunciar', label: 'Anunciar', icon: Megaphone },
  { id: 'painel', label: 'Painel', icon: LayoutDashboard },
];

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition active:scale-95 ${
                  isActive ? 'text-petrol' : 'text-ink/55 hover:text-ink'
                }`}
              >
                <Icon className={`h-5 w-5 transition ${isActive ? 'stroke-[2.5]' : ''}`} aria-hidden="true" />
                {label}
                <span
                  className={`h-1 w-1 rounded-full transition ${isActive ? 'bg-mustard' : 'bg-transparent'}`}
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
