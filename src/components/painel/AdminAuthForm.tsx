import { useState, type FormEvent } from 'react';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { signInAdmin, signUpAdmin } from '@/services/admin';

type Mode = 'signin' | 'signup';

const INPUT_CLASS =
  'w-full rounded-xl border border-ink/15 bg-paper/60 px-4 py-3 text-ink placeholder:text-ink/40 transition focus:border-petrol focus:bg-white focus:outline-none focus:ring-4 focus:ring-petrol/15';

export default function AdminAuthForm() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || password.length < 6) {
      setError('Informe o email e uma senha com pelo menos 6 caracteres.');
      return;
    }

    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInAdmin(email.trim(), password);
      } else {
        const hasSession = await signUpAdmin(email.trim(), password);
        if (!hasSession) setNotice('Conta criada. Agora entre com seu email e senha.');
        setMode('signin');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir.');
    } finally {
      setSubmitting(false);
    }
  }

  const isSignIn = mode === 'signin';

  return (
    <section className="mx-auto max-w-md space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-4xl text-ink">Área do administrador</h1>
        <p className="text-ink/70">Entre para aprovar ou rejeitar os cadastros.</p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <div className="space-y-2">
          <label htmlFor="admin-email" className="block text-sm font-semibold text-ink/80">
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="admin-password" className="block text-sm font-semibold text-ink/80">
            Senha
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-rust/10 px-4 py-3 text-sm font-medium text-rust-dark">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-xl bg-whatsapp/10 px-4 py-3 text-sm font-medium text-whatsapp-dark">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-petrol px-5 py-3.5 font-semibold text-white shadow-soft transition hover:bg-petrol-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : isSignIn ? (
            <LogIn className="h-5 w-5" aria-hidden="true" />
          ) : (
            <UserPlus className="h-5 w-5" aria-hidden="true" />
          )}
          {isSignIn ? 'Entrar' : 'Criar conta'}
        </button>

        <p className="text-center text-sm text-ink/70">
          {isSignIn ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(isSignIn ? 'signup' : 'signin');
              setError(null);
              setNotice(null);
            }}
            className="font-semibold text-petrol underline-offset-4 hover:underline"
          >
            {isSignIn ? 'Criar conta' : 'Entrar'}
          </button>
        </p>
      </form>
    </section>
  );
}
