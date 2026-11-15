import { useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Loader2, Send, Tag } from 'lucide-react';
import StampLegend from '@/components/ui/StampLegend';
import PhotoPicker from '@/components/ui/PhotoPicker';
import { formatPhoneMask, onlyPhoneDigits } from '@/lib/phone';
import { buildAdminWhatsAppUrl } from '@/lib/whatsapp';
import { submitProviderRegistration, type RegistrationInput } from '@/services/registration';
import { updateProviderProfile } from '@/services/profile';
import { uploadAvatar } from '@/services/avatar';
import type { PreparedAvatar } from '@/lib/avatarImage';
import { PLANS, REGISTRATION_FEE, formatPrice, selectedPlansTotal } from '@/lib/plans';
import type { Category, City, Plan } from '@/types/marketplace';

interface RegisterProviderScreenProps {
  cities: City[];
  categories: Category[];
}

type FormState = Omit<RegistrationInput, 'whatsappDigits' | 'selectedPlans' | 'registrationFeePaid'> & {
  whatsapp: string;
  selectedPlans: Plan[];
};

const EMPTY_FORM: FormState = {
  name: '',
  whatsapp: '',
  cityId: '',
  categoryId: '',
  headline: '',
  description: '',
  selectedPlans: [],
};

const INPUT_CLASS =
  'w-full rounded-xl border border-ink/15 bg-paper/60 px-4 py-3 text-ink placeholder:text-ink/40 transition focus:border-petrol focus:bg-white focus:outline-none focus:ring-4 focus:ring-petrol/15';

function validate(form: FormState): string | null {
  if (form.name.trim().length < 3) return 'Informe seu nome completo.';
  if (form.whatsapp.length < 10) return 'Informe seu WhatsApp com DDD.';
  if (!form.cityId) return 'Escolha sua cidade.';
  if (!form.categoryId) return 'Escolha sua categoria principal.';
  if (form.headline.trim().length < 3) return 'Informe sua especialidade.';
  if (form.description.trim().length < 10) return 'Escreva uma breve descrição (mínimo de 10 caracteres).';
  return null;
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink/80">
        {label}
      </label>
      {children}
    </div>
  );
}

function PlanToggle({ plan, checked, onToggle }: { plan: Plan; checked: boolean; onToggle: () => void }) {
  const info = PLANS[plan];
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-pressed={checked}
      onClick={onToggle}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition ${
        checked
          ? 'border-petrol bg-petrol/5 shadow-soft'
          : 'border-ink/15 bg-paper/40 hover:border-ink/30'
      }`}
    >
      <div className="space-y-0.5">
        <p className="font-semibold text-ink">{info.name}</p>
        <p className="text-xs text-ink/60">{info.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="font-mono text-sm font-bold text-ink">{formatPrice(info.price)}/mês</span>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition ${
            checked ? 'border-petrol bg-petrol text-white' : 'border-ink/25 bg-white text-transparent'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </button>
  );
}

export default function RegisterProviderScreen({ cities, categories }: RegisterProviderScreenProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [photo, setPhoto] = useState<PreparedAvatar | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  const plansTotal = useMemo(() => selectedPlansTotal(form.selectedPlans), [form.selectedPlans]);
  const grandTotal = REGISTRATION_FEE + plansTotal;

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function togglePlan(plan: Plan) {
    setForm((prev) => ({
      ...prev,
      selectedPlans: prev.selectedPlans.includes(plan)
        ? prev.selectedPlans.filter((p) => p !== plan)
        : [...prev.selectedPlans, plan],
    }));
  }

  async function handleSubmit() {
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setStatus('sending');
    try {
      const providerId = await submitProviderRegistration({
        name: form.name.trim(),
        whatsappDigits: form.whatsapp,
        cityId: form.cityId,
        categoryId: form.categoryId,
        headline: form.headline.trim(),
        description: form.description.trim(),
        selectedPlans: form.selectedPlans,
        registrationFeePaid: false,
      });
      let photoPath: string | null = null;
      if (photo) {
        photoPath = await uploadAvatar(providerId, photo);
        const city = cities.find((item) => item.id === form.cityId);
        if (!city) throw new Error('Escolha sua cidade.');
        await updateProviderProfile({
          providerId,
          currentWhatsappDigits: form.whatsapp,
          name: form.name.trim(),
          whatsappDigits: form.whatsapp,
          city,
          headline: form.headline.trim(),
          description: form.description.trim(),
          photoUrl: photoPath,
        });
      }
      setPaymentMessage(buildPaymentMessage());
      setStatus('sent');
      window.open(buildAdminWhatsAppUrl(buildPaymentMessage()), '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar seu cadastro.');
      setStatus('idle');
    }
  }

  function buildPaymentMessage(): string {
    const cityName = cities.find((city) => city.id === form.cityId)?.name ?? '';
    const categoryName = categories.find((category) => category.id === form.categoryId)?.name ?? '';
    const seals = form.selectedPlans.map((plan) => PLANS[plan].name).join(', ') || 'Nenhum';
    return [
      'Olá! Quero me cadastrar no Tem Quem Faz.',
      `Nome: ${form.name.trim()}`,
      `Cidade: ${cityName}`,
      `Categoria: ${categoryName}`,
      `Selos: ${seals}`,
      `Total: ${formatPrice(grandTotal)}`,
      'Como faço o pagamento?',
    ].join('\n');
  }

  const sending = status === 'sending';

  if (status === 'sent') {
    return (
      <section className="mx-auto flex max-w-md animate-fade flex-col items-center rounded-3xl bg-white px-6 py-12 text-center shadow-card">
        <CheckCircle2 className="h-14 w-14 text-whatsapp" aria-hidden="true" />
        <h1 className="mt-5 text-3xl text-ink">Cadastro enviado! Aguarde aprovação.</h1>
        <p className="mt-3 text-ink/70">
          Converse com a gente no WhatsApp para combinar o pagamento. Depois disso, seu perfil aparece na busca da
          sua cidade.
        </p>
        {paymentMessage && (
          <a
            href={buildAdminWhatsAppUrl(paymentMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 text-sm font-semibold text-whatsapp underline-offset-4 hover:underline"
          >
            Não abriu o WhatsApp? Toque aqui para abrir.
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY_FORM);
            setPhoto(null);
            setPaymentMessage(null);
            setStatus('idle');
          }}
          className="mt-8 rounded-xl bg-petrol px-5 py-3 font-semibold text-white shadow-soft transition hover:bg-petrol-dark"
        >
          Fazer outro cadastro
        </button>
      </section>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      noValidate
      className="mx-auto max-w-2xl space-y-6"
    >
      <header className="space-y-2">
        <h1 className="text-4xl text-ink">Anuncie seu trabalho</h1>
        <p className="text-ink/70">
          Preencha os dados, escolha seus selos e finalize pelo WhatsApp. Depois da aprovação, você aparece para quem
          procura serviços na sua cidade.
        </p>
      </header>

      <div className="space-y-6 rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <PhotoPicker
          label="Foto de perfil"
          photoUrl={null}
          fallbackName={form.name}
          onPhoto={(picked) => setPhoto(picked)}
          onRemove={() => setPhoto(null)}
        />

        <Field label="Nome completo" htmlFor="provider-name">
          <input
            id="provider-name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="Ex.: Maria da Silva"
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="WhatsApp" htmlFor="provider-whatsapp">
          <input
            id="provider-whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={formatPhoneMask(form.whatsapp)}
            onChange={(e) => setField('whatsapp', onlyPhoneDigits(e.target.value))}
            placeholder="(33) 99999-9999"
            className={`${INPUT_CLASS} font-mono`}
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Cidade" htmlFor="provider-city">
            <select
              id="provider-city"
              value={form.cityId}
              onChange={(e) => setField('cityId', e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Escolha a cidade</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name} - {city.uf}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Categoria principal" htmlFor="provider-category">
            <select
              id="provider-category"
              value={form.categoryId}
              onChange={(e) => setField('categoryId', e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Escolha a categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Especialidade" htmlFor="provider-headline">
          <input
            id="provider-headline"
            type="text"
            value={form.headline}
            onChange={(e) => setField('headline', e.target.value)}
            placeholder="Ex.: Instalações residenciais e manutenção"
            maxLength={60}
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="Breve descrição" htmlFor="provider-description">
          <textarea
            id="provider-description"
            rows={4}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="Conte o que você faz, há quanto tempo atua e em quais bairros."
            maxLength={400}
            className={`${INPUT_CLASS} resize-none`}
          />
        </Field>
      </div>

      <StampLegend />

      <section className="space-y-4 rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <header className="space-y-1">
          <h2 className="flex items-center gap-2 text-2xl text-ink">
            <Tag className="h-5 w-5 text-petrol" aria-hidden="true" />
            Escolha seus selos
          </h2>
          <p className="text-sm text-ink/70">Selecione um ou mais. Você pode combinar selos para mais destaque.</p>
        </header>

        <div className="space-y-3">
          {(['bairro', 'cidade', 'regiao'] as Plan[]).map((plan) => (
            <PlanToggle
              key={plan}
              plan={plan}
              checked={form.selectedPlans.includes(plan)}
              onToggle={() => togglePlan(plan)}
            />
          ))}
        </div>

        <div className="space-y-2 rounded-2xl bg-paper/70 p-4 font-mono text-sm">
          <div className="flex justify-between text-ink/70">
            <span>Taxa de cadastro (única)</span>
            <span>{formatPrice(REGISTRATION_FEE)}</span>
          </div>
          {form.selectedPlans.map((plan) => (
            <div key={plan} className="flex justify-between text-ink/70">
              <span>{PLANS[plan].name} (mensal)</span>
              <span>{formatPrice(PLANS[plan].price)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-bold text-ink">
            <span>Total</span>
            <span>{formatPrice(grandTotal)}</span>
          </div>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-rust/10 px-4 py-3 text-sm font-medium text-rust-dark">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-5 py-4 text-lg font-semibold text-white shadow-soft transition hover:bg-whatsapp-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> : <Send className="h-6 w-6" aria-hidden="true" />}
        {sending ? 'Enviando...' : 'Enviar no WhatsApp para pagar'}
      </button>
    </form>
  );
}
