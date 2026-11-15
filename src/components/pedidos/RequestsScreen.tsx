import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clock,
  Hammer,
  HardHat,
  ImagePlus,
  Loader2,
  MapPin,
  Paintbrush,
  Plus,
  Send,
  Sparkles,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import CategoryChips from '@/components/buscar/CategoryChips';
import CityPicker from '@/components/buscar/CityPicker';
import PhotoPicker from '@/components/ui/PhotoPicker';
import { avatarSrc } from '@/lib/avatarUrl';
import { formatPhoneMask, onlyPhoneDigits } from '@/lib/phone';
import { buildRequestWhatsAppUrl, fetchOpenRequests, publishRequest, resolveRequest, deleteRequest, uploadRequestPhoto, removeRequestPhoto } from '@/services/requests';
import type { PreparedAvatar } from '@/lib/avatarImage';
import type { RequestCategory, ServiceRequest } from '@/types/requests';
import type { City } from '@/types/marketplace';

interface RequestsScreenProps {
  cities: City[];
}

const CATEGORIES: { id: RequestCategory; label: string; icon: LucideIcon }[] = [
  { id: 'pedreiro', label: 'Pedreiro', icon: HardHat },
  { id: 'eletricista', label: 'Eletricista', icon: Wrench },
  { id: 'encanador', label: 'Encanador', icon: Wrench },
  { id: 'diarista', label: 'Diarista', icon: Sparkles },
  { id: 'pintor', label: 'Pintor', icon: Paintbrush },
  { id: 'outro', label: 'Outro', icon: Hammer },
];

function categoryLabel(id: RequestCategory): string {
  return CATEGORIES.find((item) => item.id === id)?.label ?? 'Outro';
}

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  return `há ${days} dias`;
}

const INPUT_CLASS =
  'w-full rounded-xl border border-ink/15 bg-paper/60 px-4 py-3 text-ink placeholder:text-ink/40 transition focus:border-petrol focus:bg-white focus:outline-none focus:ring-4 focus:ring-petrol/15';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink/80">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function RequestsScreen({ cities }: RequestsScreenProps) {
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [category, setCategory] = useState<RequestCategory | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function reload() {
    try {
      const list = await fetchOpenRequests();
      setRequests(list);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  // Open requests first (resolved ones were removed from the feed anyway);
  // newest first.
  const filtered = useMemo(() => {
    if (!requests) return [];
    return requests
      .filter((request) => !category || request.category === category)
      .sort((a, b) => {
        if ((a.status === 'resolvido') !== (b.status === 'resolvido')) {
          return a.status === 'resolvido' ? 1 : -1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [requests, category]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl text-ink">Pedidos da cidade</h1>
          <p className="text-ink/70">
            Alguém precisa de ajuda? Veja quem está pedindo um serviço perto de você — ou publique o seu pedido.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((prev) => !prev)}
          aria-expanded={formOpen}
          className="flex items-center gap-2 rounded-xl bg-petrol px-5 py-3 font-semibold text-white shadow-soft transition hover:bg-petrol-dark"
        >
          {formOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Plus className="h-5 w-5" aria-hidden="true" />}
          {formOpen ? 'Fechar' : 'Novo pedido'}
        </button>
      </header>

      {formOpen && (
        <NewRequestForm
          cities={cities}
          onPublished={() => {
            setFormOpen(false);
            void reload();
          }}
        />
      )}

      <CategoryChips
        categories={CATEGORIES.map(({ label }) => label)}
        active={category ? categoryLabel(category) : null}
        onChange={(label) => setCategory(label ? (CATEGORIES.find((item) => item.label === label)?.id ?? null) : null)}
      />

      {requests === null && !loadError && (
        <div className="flex flex-col items-center gap-3 py-12 text-ink/80">
          <Loader2 className="h-8 w-8 animate-spin text-petrol" aria-hidden="true" />
          <p>Carregando pedidos...</p>
        </div>
      )}

      {loadError && (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-10 text-center shadow-card">
          <p className="font-semibold text-ink">Não foi possível carregar os pedidos.</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-4 rounded-xl bg-petrol px-5 py-2.5 font-semibold text-white shadow-soft transition hover:bg-petrol-dark"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {requests !== null && !loadError && filtered.length === 0 && (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-12 text-center shadow-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mustard/20 text-ink">
            <Hammer className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mt-4 text-xl text-ink">
            {category ? 'Nenhum pedido nessa categoria por enquanto.' : 'Nenhum pedido aberto por enquanto.'}
          </p>
          <p className="mt-1 text-sm text-ink/75">Publique o primeiro com "+ Novo pedido"!</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onChanged={() => void reload()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RequestCardProps {
  request: ServiceRequest;
  onChanged: () => void;
}

function RequestCard({ request, onChanged }: RequestCardProps) {
  const [ownerDigits, setOwnerDigits] = useState('');
  const [showOwnerCheck, setShowOwnerCheck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolved = request.status === 'resolvido';
  const categoryInfo = CATEGORIES.find((item) => item.id === request.category);
  const CategoryIcon = categoryInfo?.icon ?? Hammer;

  async function runOwnerAction(action: 'resolve' | 'delete') {
    const digits = onlyPhoneDigits(ownerDigits);
    if (digits.length < 10) {
      setError('Digite o WhatsApp usado no pedido.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (action === 'resolve') {
        await resolveRequest(request.id, digits);
      } else {
        await deleteRequest(request.id, digits);
      }
      onChanged();
    } catch {
      setError('Não funcionou. Confira se o WhatsApp é o mesmo do pedido.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className={`flex flex-col rounded-3xl bg-white p-5 shadow-card ring-1 ring-ink/5 transition sm:p-6 ${
        resolved ? 'opacity-60 saturate-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${resolved ? 'bg-ink/10 text-ink/60' : 'bg-petrol/10 text-petrol'}`}>
          <CategoryIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink">{categoryLabel(request.category)}</h3>
            {resolved && (
              <span className="flex items-center gap-1 rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-semibold text-ink/70">
                <Check className="h-3 w-3" aria-hidden="true" />
                Resolvido
              </span>
            )}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink/60">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {request.city.name}
            </span>
            <span className="flex items-center gap-1 font-mono">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {timeAgo(request.createdAt)}
            </span>
          </p>
        </div>
        {request.photoUrl && (
          <img
            src={avatarSrc(request.photoUrl)}
            alt={`Foto do pedido de ${request.name}`}
            loading="lazy"
            className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-soft"
          />
        )}
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/85">{request.description}</p>

      <p className="mt-3 text-xs font-medium text-ink/60">por {request.name}</p>

      {!resolved && (
        <a
          href={buildRequestWhatsAppUrl(request)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-3 font-semibold text-white shadow-soft transition hover:bg-whatsapp-dark"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          Chamar no WhatsApp
        </a>
      )}

      <div className="mt-2">
        {showOwnerCheck ? (
          <div className="space-y-2 rounded-xl bg-paper/70 p-3">
            <p className="text-xs font-medium text-ink/70">Confirme com o WhatsApp usado no pedido:</p>
            <input
              type="tel"
              inputMode="tel"
              value={formatPhoneMask(ownerDigits)}
              onChange={(e) => setOwnerDigits(onlyPhoneDigits(e.target.value))}
              placeholder="(33) 99999-9999"
              className={`${INPUT_CLASS} font-mono`}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void runOwnerAction('resolve')}
                className="flex-1 rounded-lg bg-petrol px-3 py-2 text-sm font-semibold text-white transition hover:bg-petrol-dark disabled:opacity-60"
              >
                Resolvido
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runOwnerAction('delete')}
                className="flex-1 rounded-lg border border-rust/40 px-3 py-2 text-sm font-semibold text-rust-dark transition hover:bg-rust/5 disabled:opacity-60"
              >
                Excluir
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowOwnerCheck(false)}
              className="w-full text-xs text-ink/60 underline-offset-2 hover:underline"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowOwnerCheck(true)}
            className="w-full rounded-lg px-3 py-2 text-xs font-medium text-ink/50 transition hover:bg-ink/5 hover:text-ink"
          >
            É seu pedido? Marcar como resolvido ou excluir
          </button>
        )}
        {error && <p className="mt-1 text-xs font-medium text-rust-dark">{error}</p>}
      </div>
    </article>
  );
}

interface NewRequestFormProps {
  cities: City[];
  onPublished: () => void;
}

function NewRequestForm({ cities, onPublished }: NewRequestFormProps) {
  const potencity = cities.find((city) => city.slug === 'pote-mg');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RequestCategory | null>(null);
  const [cityId, setCityId] = useState(potencity?.id ?? cities[0]?.id ?? '');
  const [photo, setPhoto] = useState<PreparedAvatar | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (name.trim().length < 3) return 'Informe seu nome.';
    if (whatsapp.length < 10) return 'Informe seu WhatsApp com DDD.';
    if (description.trim().length < 10) return 'Descreva o que você precisa (mínimo de 10 caracteres).';
    if (!category) return 'Escolha uma categoria.';
    if (!cityId) return 'Escolha sua cidade.';
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    const city = cities.find((item) => item.id === cityId);
    if (!city) {
      setError('Escolha sua cidade.');
      return;
    }

    setError(null);
    setPublishing(true);
    let uploadedPath: string | null = null;
    try {
      uploadedPath = photo ? await uploadRequestPhoto(photo) : null;
      await publishRequest({
        name: name.trim(),
        whatsappDigits: whatsapp,
        description: description.trim(),
        category: category as RequestCategory,
        city,
        photoPath: uploadedPath,
      });
      onPublished();
    } catch (err) {
      if (uploadedPath) await removeRequestPhoto(uploadedPath);
      setError(err instanceof Error ? err.message : 'Não foi possível publicar seu pedido.');
      setPublishing(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      noValidate
      className="space-y-5 rounded-3xl bg-white p-6 shadow-card sm:p-8"
    >
      <PhotoPicker
        label="Foto do pedido (opcional)"
        photoUrl={null}
        fallbackName={name}
        onPhoto={(picked) => setPhoto(picked)}
        onRemove={() => setPhoto(null)}
        disabled={publishing}
      />

      <Field label="Seu nome" htmlFor="request-name">
        <input
          id="request-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Maria da Silva"
          className={INPUT_CLASS}
        />
      </Field>

      <Field label="Seu WhatsApp (quem vai ajudar vai chamar você)" htmlFor="request-whatsapp">
        <input
          id="request-whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={formatPhoneMask(whatsapp)}
          onChange={(e) => setWhatsapp(onlyPhoneDigits(e.target.value))}
          placeholder="(33) 99999-9999"
          className={`${INPUT_CLASS} font-mono`}
        />
      </Field>

      <Field label="O que você precisa?" htmlFor="request-description">
        <textarea
          id="request-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex.: Preciso de um eletricista para trocar o chuveiro e verificar a fiação do quarto."
          maxLength={500}
          className={`${INPUT_CLASS} resize-none`}
        />
      </Field>

      <Field label="Categoria" htmlFor="request-category">
        <select
          id="request-category"
          value={category ?? ''}
          onChange={(e) => setCategory((e.target.value || null) as RequestCategory | null)}
          className={INPUT_CLASS}
        >
          <option value="">Escolha a categoria</option>
          {CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>

      <CityPicker cities={cities} selectedCityId={cityId} onChange={setCityId} />

      {error && (
        <p role="alert" className="rounded-xl bg-rust/10 px-4 py-3 text-sm font-medium text-rust-dark">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={publishing}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-5 py-4 text-lg font-semibold text-white shadow-soft transition hover:bg-whatsapp-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {publishing ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-6 w-6" aria-hidden="true" />}
        {publishing ? 'Publicando...' : 'Publicar pedido'}
      </button>
      <p className="text-center text-xs text-ink/60">
        Seu WhatsApp fica visível para quem for ajudar você.
      </p>
    </form>
  );
}
