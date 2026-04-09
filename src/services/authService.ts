import { supabase, isSupabaseConfigured } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

const MISSING_CONFIG_ERROR = 'Authentication is not configured. Please contact support.';


export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

// Registrar nuevo usuario
export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { success: false, error: MISSING_CONFIG_ERROR };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { success: false, error: error.message };
  return { success: true, user: data.user ?? undefined, session: data.session ?? undefined };
}

// Iniciar sesión
export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { success: false, error: MISSING_CONFIG_ERROR };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };
  return { success: true, user: data.user, session: data.session };
}

// OAuth con Google
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: false, error: MISSING_CONFIG_ERROR };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Cerrar sesión
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: false, error: MISSING_CONFIG_ERROR };
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sign out failed',
    };
  }
}

// Obtener sesión actual (para auto-login al abrir la app)
export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Obtener usuario actual
export async function getUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Escuchar cambios de auth (login, logout, token refresh)
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}
