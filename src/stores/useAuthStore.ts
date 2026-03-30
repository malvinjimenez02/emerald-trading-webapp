import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import * as authService from '../services/authService';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: async () => {
    try {
      const session = await authService.getSession();
      if (session) {
        set({ user: session.user, session, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, session: null, isAuthenticated: false, isLoading: false });
      }

      // Escuchar cambios (token refresh, logout, etc.)
      authService.onAuthStateChange((_event, session) => {
        if (session) {
          set({ user: session.user, session, isAuthenticated: true });
        } else {
          set({ user: null, session: null, isAuthenticated: false });
        }
      });
    } catch {
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null });
    const result = await authService.signUp(email, password);
    if (result.success) {
      set({
        user: result.user ?? null,
        session: result.session ?? null,
        isAuthenticated: !!result.session,
        isLoading: false,
      });
      return true;
    } else {
      set({ error: result.error ?? 'Sign up failed', isLoading: false });
      return false;
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    const result = await authService.signIn(email, password);
    if (result.success) {
      set({
        user: result.user ?? null,
        session: result.session ?? null,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } else {
      set({ error: result.error ?? 'Sign in failed', isLoading: false });
      return false;
    }
  },

  signOut: async () => {
    await authService.signOut();
    set({ user: null, session: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
