import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import BottomNav, { type TabId } from '@/components/BottomNav';
import SearchScreen from '@/components/buscar/SearchScreen';
import RegisterProviderScreen from '@/components/anunciar/RegisterProviderScreen';
import RequestsScreen from '@/components/pedidos/RequestsScreen';
import AdminScreen from '@/components/painel/AdminScreen';
import { useMarketplaceData } from '@/hooks/useMarketplaceData';

function App() {
  const [tab, setTab] = useState<TabId>('buscar');
  const { state, reload } = useMarketplaceData();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-6 sm:px-6 lg:px-8">
        {state.status === 'loading' && (
          <div className="mt-16 flex flex-col items-center gap-3 text-ink/80">
            <Loader2 className="h-8 w-8 animate-spin text-petrol" aria-hidden="true" />
            <p>Carregando prestadores...</p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="mx-auto mt-16 flex max-w-md flex-col items-center rounded-2xl border-2 border-ink bg-white px-6 py-10 text-center shadow-[4px_4px_0_0_#23201B]">
            <AlertTriangle className="h-10 w-10 text-rust" aria-hidden="true" />
            <p className="mt-4 text-lg font-semibold">{state.message}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-5 rounded-xl border-2 border-ink bg-mustard px-5 py-2.5 font-semibold text-ink shadow-[3px_3px_0_0_#23201B] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {state.status === 'ready' && tab === 'buscar' && (
          <SearchScreen cities={state.cities} providers={state.providers} stories={state.stories} />
        )}
        {state.status === 'ready' && tab === 'anunciar' && (
          <RegisterProviderScreen cities={state.cities} categories={state.categories} />
        )}
        {state.status === 'ready' && tab === 'painel' && (
          <AdminScreen cities={state.cities} onApprovalChange={reload} onProfileSaved={reload} />
        )}
        {state.status === 'ready' && tab === 'pedidos' && <RequestsScreen cities={state.cities} />}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}

export default App;
