import { useState } from 'react';
import { AlertTriangle, Loader2, UserRound } from 'lucide-react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { signOutAdmin } from '@/services/admin';
import AdminAuthForm from '@/components/painel/AdminAuthForm';
import PendingProviderList from '@/components/painel/PendingProviderList';
import ProviderSealsManager from '@/components/painel/ProviderSealsManager';
import ProfileEditor from '@/components/perfil/ProfileEditor';
import type { City } from '@/types/marketplace';

interface AdminScreenProps {
  cities: City[];
  onApprovalChange: () => void;
  onProfileSaved: () => void;
}

export default function AdminScreen({ cities, onApprovalChange, onProfileSaved }: AdminScreenProps) {
  const access = useAdminAccess();
  const [signingOut, setSigningOut] = useState(false);

  if (access === 'checking') {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 text-ink/80">
        <Loader2 className="h-8 w-8 animate-spin text-petrol" aria-hidden="true" />
        <p>Verificando acesso...</p>
      </div>
    );
  }

  if (access === 'signed-out') return <AdminAuthForm />;

  async function handleSignOut() {
    setSigningOut(true);
    await signOutAdmin();
  }

  const signOutButton = (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={signingOut}
      className="rounded-xl border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-rust hover:text-rust disabled:opacity-60"
    >
      Sair
    </button>
  );

  if (access === 'denied') {
    return (
      <section className="mx-auto flex max-w-md flex-col items-center rounded-3xl bg-white px-6 py-12 text-center shadow-card">
        <AlertTriangle className="h-12 w-12 text-rust" aria-hidden="true" />
        <h1 className="mt-5 text-3xl text-ink">Sem acesso ao painel</h1>
        <p className="mt-3 text-ink/70">Esta conta não tem permissão para aprovar cadastros.</p>
        <div className="mt-8">{signOutButton}</div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-10">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl text-ink">Painel</h1>
          <p className="text-ink/70">Aprove os cadastros e mantenha seu perfil em dia.</p>
        </div>
        {signOutButton}
      </header>

      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-2xl text-ink">
          <UserRound className="h-5 w-5 text-petrol" aria-hidden="true" />
          Meu perfil
        </h2>
        <p className="text-sm text-ink/70">
          Atualize sua foto, nome, profissão, cidade, descrição e WhatsApp. As mudanças aparecem na busca na hora.
        </p>
        <ProfileEditor cities={cities} onSaved={onProfileSaved} />
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl text-ink">Selos dos prestadores</h2>
        <ProviderSealsManager onPlansChanged={onApprovalChange} />
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl text-ink">Aprovações</h2>
        <PendingProviderList onApprovalChange={onApprovalChange} />
      </div>
    </section>
  );
}
