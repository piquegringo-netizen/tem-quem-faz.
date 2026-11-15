import { supabase } from '@/lib/supabase';
import type { ProviderStatus } from '@/types/marketplace';

export async function signInAdmin(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(translateAuthError(error.message));
}

export async function signUpAdmin(email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(translateAuthError(error.message));
  return data.session !== null;
}

export async function signOutAdmin(): Promise<void> {
  await supabase.auth.signOut();
}

export async function fetchIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) throw new Error('Não foi possível verificar o acesso.');
  return data === true;
}

export async function updateProviderStatus(providerId: string, status: ProviderStatus): Promise<void> {
  const { error } = await supabase.from('providers').update({ status }).eq('id', providerId);
  if (error) throw new Error('Não foi possível atualizar o cadastro. Tente novamente.');
}

function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'Email ou senha incorretos.';
  if (normalized.includes('already registered')) return 'Este email já tem conta. Entre com sua senha.';
  if (normalized.includes('password')) return 'A senha precisa ter pelo menos 6 caracteres.';
  return 'Não foi possível concluir. Verifique os dados e tente de novo.';
}
