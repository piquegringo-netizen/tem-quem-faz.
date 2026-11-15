import { useState, useEffect, useRef, type ReactNode } from 'react';
import { CheckCircle2, Images, Loader2, LogIn, Plus, Save, X } from 'lucide-react';
import PhotoPicker from '@/components/ui/PhotoPicker';
import { avatarSrc } from '@/lib/avatarUrl';
import { onlyPhoneDigits, formatPhoneMask } from '@/lib/phone';
import { fetchProviderByWhatsapp, updateProviderProfile, type ProviderProfile } from '@/services/profile';
import { uploadAvatar } from '@/services/avatar';
import { addPortfolioPhoto, fetchPortfolio, removePortfolioPhoto, PORTFOLIO_MAX_PHOTOS, type PortfolioPhoto } from '@/services/portfolio';
import type { PreparedAvatar } from '@/lib/avatarImage';
import { prepareAvatar } from '@/lib/avatarImage';
import type { City } from '@/types/marketplace';

export const PROFILE_INPUT_CLASS =
  'w-full rounded-xl border border-ink/15 bg-paper/60 px-4 py-3 text-ink placeholder:text-ink/40 transition focus:border-petrol focus:bg-white focus:outline-none focus:ring-4 focus:ring-petrol/15';

export function ProfileField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink/80">
        {label}
      </label>
      {children}
    </div>
  );
}

interface ProfileEditorProps {
  cities: City[];
  onSaved?: (updated: ProviderProfile) => void;
}

/**
 * Identify-by-WhatsApp + full profile editing flow, reused by the
 * "Perfil" tab and the "Meu perfil" section of the Painel tab.
 */
export default function ProfileEditor({ cities, onSaved }: ProfileEditorProps) {
  const [screen, setScreen] = useState<'identify' | 'edit' | 'saved'>('identify');
  const [whatsapp, setWhatsapp] = useState('');
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [checking, setChecking] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);

  async function handleIdentify() {
    const digits = onlyPhoneDigits(whatsapp);
    if (digits.length < 10) {
      setIdentifyError('Informe seu WhatsApp com DDD.');
      return;
    }
    setIdentifyError(null);
    setChecking(true);
    try {
      const found = await fetchProviderByWhatsapp(digits);
      if (!found) {
        setIdentifyError('Não encontramos um cadastro com esse WhatsApp. Confira o número ou se cadastre na aba Anunciar.');
        return;
      }
      setProfile(found);
      setScreen('edit');
    } catch (err) {
      setIdentifyError(err instanceof Error ? err.message : 'Não foi possível buscar seu perfil.');
    } finally {
      setChecking(false);
    }
  }

  if (screen === 'identify') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleIdentify();
        }}
        noValidate
        className="space-y-5 rounded-3xl bg-white p-6 shadow-card sm:p-8"
      >
        <ProfileField label="Seu WhatsApp (o do cadastro)" htmlFor="identify-whatsapp">
          <input
            id="identify-whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={formatPhoneMask(whatsapp)}
            onChange={(e) => setWhatsapp(onlyPhoneDigits(e.target.value))}
            placeholder="(33) 99999-9999"
            className={`${PROFILE_INPUT_CLASS} font-mono`}
          />
        </ProfileField>

        {identifyError && (
          <p role="alert" className="rounded-xl bg-rust/10 px-4 py-3 text-sm font-medium text-rust-dark">
            {identifyError}
          </p>
        )}

        <button
          type="submit"
          disabled={checking}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-petrol px-5 py-4 text-lg font-semibold text-white shadow-soft transition hover:bg-petrol-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {checking ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> : <LogIn className="h-6 w-6" aria-hidden="true" />}
          {checking ? 'Buscando...' : 'Entrar no meu perfil'}
        </button>
      </form>
    );
  }

  if (screen === 'saved' && profile) {
    return (
      <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-12 text-center shadow-card">
        <CheckCircle2 className="h-14 w-14 text-whatsapp" aria-hidden="true" />
        <h2 className="mt-5 text-3xl text-ink">Perfil atualizado!</h2>
        <p className="mt-3 text-ink/70">
          {profile.status === 'aprovado'
            ? 'Suas alterações já aparecem na busca.'
            : 'Assim que seu cadastro for aprovado, tudo aparece na busca.'}
        </p>
        <button
          type="button"
          onClick={() => setScreen('edit')}
          className="mt-8 rounded-xl bg-petrol px-5 py-3 font-semibold text-white shadow-soft transition hover:bg-petrol-dark"
        >
          Voltar ao meu perfil
        </button>
      </div>
    );
  }

  return profile ? (
    <ProfileEditForm
      key={profile.id}
      profile={profile}
      cities={cities}
      onSaved={(updated) => {
        setProfile(updated);
        setScreen('saved');
        onSaved?.(updated);
      }}
    />
  ) : null;
}

interface ProfileEditFormProps {
  profile: ProviderProfile;
  cities: City[];
  onSaved: (updated: ProviderProfile) => void;
}

function ProfileEditForm({ profile, cities, onSaved }: ProfileEditFormProps) {
  const [name, setName] = useState(profile.name);
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp.replace(/^55/, ''));
  const [cityId, setCityId] = useState(profile.cityId);
  const [headline, setHeadline] = useState(profile.headline);
  const [description, setDescription] = useState(profile.description);
  const [photoPath, setPhotoPath] = useState<string | null>(profile.photoUrl);
  const [photo, setPhoto] = useState<PreparedAvatar | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (name.trim().length < 3) return 'Informe seu nome completo.';
    if (whatsapp.length < 10) return 'Informe seu WhatsApp com DDD.';
    if (!cityId) return 'Escolha sua cidade.';
    if (headline.trim().length < 3) return 'Informe sua especialidade.';
    if (description.trim().length < 10) return 'Escreva uma breve descrição (mínimo de 10 caracteres).';
    return null;
  }

  async function handleSave() {
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
    setSaving(true);
    try {
      let finalPhotoPath = photoPath;
      if (photo) {
        finalPhotoPath = await uploadAvatar(profile.id, photo);
        setPhotoPath(finalPhotoPath);
        setPhoto(null);
        setRemovePhoto(false);
      }
      // '' clears the photo, null keeps the current one.
      const forDb = removePhoto ? '' : finalPhotoPath;
      await updateProviderProfile({
        providerId: profile.id,
        currentWhatsappDigits: profile.whatsapp.replace(/^55/, ''),
        name: name.trim(),
        whatsappDigits: whatsapp,
        city,
        headline: headline.trim(),
        description: description.trim(),
        photoUrl: forDb,
      });
      if (removePhoto) {
        setPhotoPath(null);
        setRemovePhoto(false);
      }
      onSaved({
        ...profile,
        name: name.trim(),
        whatsapp: `55${whatsapp}`,
        cityId,
        headline: headline.trim(),
        description: description.trim(),
        photoUrl: removePhoto ? null : finalPhotoPath,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  }

  const effectivePhoto = removePhoto ? null : photoPath;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSave();
      }}
      noValidate
      className="space-y-6 rounded-3xl bg-white p-6 shadow-card sm:p-8"
    >
      <PhotoPicker
        label="Foto de perfil"
        photoUrl={avatarSrc(effectivePhoto) ?? null}
        fallbackName={name}
        onPhoto={(picked) => {
          setPhoto(picked);
          setRemovePhoto(false);
        }}
        onRemove={() => {
          setPhoto(null);
          setRemovePhoto(true);
        }}
        disabled={saving}
      />

      <PortfolioSection profile={profile} whatsappDigits={profile.whatsapp.replace(/^55/, '')} />

      <ProfileField label="Nome completo" htmlFor="profile-name">        <input
          id="profile-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={PROFILE_INPUT_CLASS}
        />
      </ProfileField>

      <ProfileField label="WhatsApp" htmlFor="profile-whatsapp">
        <input
          id="profile-whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={formatPhoneMask(whatsapp)}
          onChange={(e) => setWhatsapp(onlyPhoneDigits(e.target.value))}
          className={`${PROFILE_INPUT_CLASS} font-mono`}
        />
      </ProfileField>

      <ProfileField label="Cidade" htmlFor="profile-city">
        <select id="profile-city" value={cityId} onChange={(e) => setCityId(e.target.value)} className={PROFILE_INPUT_CLASS}>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name} - {city.uf}
            </option>
          ))}
        </select>
      </ProfileField>

      <ProfileField label="Profissão / Especialidade" htmlFor="profile-headline">
        <input
          id="profile-headline"
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Ex.: Instalações residenciais e manutenção"
          maxLength={60}
          className={PROFILE_INPUT_CLASS}
        />
      </ProfileField>

      <ProfileField label="Breve descrição" htmlFor="profile-description">
        <textarea
          id="profile-description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Conte o que você faz, há quanto tempo atua e em quais bairros."
          maxLength={400}
          className={`${PROFILE_INPUT_CLASS} resize-none`}
        />
      </ProfileField>

      {error && (
        <p role="alert" className="rounded-xl bg-rust/10 px-4 py-3 text-sm font-medium text-rust-dark">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-5 py-4 text-lg font-semibold text-white shadow-soft transition hover:bg-whatsapp-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> : <Save className="h-6 w-6" aria-hidden="true" />}
        {saving ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  );
}

interface PortfolioSectionProps {
  profile: ProviderProfile;
  whatsappDigits: string;
}

function PortfolioSection({ profile, whatsappDigits }: PortfolioSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<PortfolioPhoto[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchPortfolio(profile.id)
      .then((list) => {
        if (active) setPhotos(list);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [profile.id]);

  async function handleAdd(photo: PreparedAvatar) {
    setError(null);
    setUploading(true);
    try {
      const created = await addPortfolioPhoto(profile.id, whatsappDigits, photo);
      setPhotos((prev) => (prev ? [created, ...prev] : [created]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível adicionar a foto.');
    } finally {
      setUploading(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = '';
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const prepared = await prepareAvatar(file);
      await handleAdd(prepared);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível usar esta foto.');
      setUploading(false);
    }
  }

  async function handleRemove(photoId: string) {
    setError(null);
    try {
      await removePortfolioPhoto(photoId, whatsappDigits);
      setPhotos((prev) => (prev ? prev.filter((item) => item.id !== photoId) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remover a foto.');
    }
  }

  const atLimit = (photos?.length ?? 0) >= PORTFOLIO_MAX_PHOTOS;

  return (
    <section className="space-y-3 rounded-2xl bg-paper/70 p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <Images className="h-5 w-5 text-petrol" aria-hidden="true" />
            Fotos dos trabalhos
          </h3>
          <p className="text-xs text-ink/60">
            Mostre serviços que você já fez ({photos?.length ?? 0} de {PORTFOLIO_MAX_PHOTOS}). Aparecem no seu perfil público.
          </p>
        </div>
      </header>

      {photos === null && !loadError && (
        <div className="flex items-center gap-2 py-2 text-sm text-ink/70">
          <Loader2 className="h-4 w-4 animate-spin text-petrol" aria-hidden="true" />
          Carregando fotos...
        </div>
      )}

      {loadError && <p className="text-sm font-medium text-rust-dark">Não foi possível carregar as fotos.</p>}

      {photos !== null && (
        <div className="flex flex-wrap gap-3">
          {photos.map((item) => (
            <div key={item.id} className="group relative">
              <img
                src={avatarSrc(item.path)}
                alt="Trabalho realizado"
                loading="lazy"
                className="h-24 w-24 rounded-xl object-cover shadow-soft ring-2 ring-white"
              />
              <button
                type="button"
                onClick={() => void handleRemove(item.id)}
                aria-label="Remover foto"
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-rust text-white shadow-soft transition hover:bg-rust-dark"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}

          {!atLimit && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ink/25 text-ink/60 transition hover:border-petrol hover:text-petrol disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-petrol" aria-hidden="true" />
              ) : (
                <>
                  <Plus className="h-6 w-6" aria-hidden="true" />
                  <span className="text-xs font-medium">Adicionar</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />

      {error && <p className="text-xs font-medium text-rust-dark">{error}</p>}
    </section>
  );
}
