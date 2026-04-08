import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import * as authService from '../services/authService';
import type { UserProfile } from '../services/profileService';
import * as profileService from '../services/profileService';

function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return (
    profile.first_name.trim().length > 0 &&
    profile.last_name.trim().length > 0 &&
    profile.journal_name.trim().length > 0
  );
}

async function loadProfileState(userId: string): Promise<{ profile: UserProfile | null; error: string | null }> {
  const profileResult = await profileService.getProfile(userId);
  if (!profileResult.success) {
    return { profile: null, error: profileResult.error ?? 'Failed to load profile' };
  }
  return { profile: profileResult.profile ?? null, error: null };
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  hasCompletedProfile: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  saveProfile: (firstName: string, lastName: string, journalName: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  hasCompletedProfile: false,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: async () => {
    try {
      const session = await authService.getSession();
      if (session) {
        const profileState = await loadProfileState(session.user.id);
        set({
          user: session.user,
          session,
          profile: profileState.profile,
          hasCompletedProfile: isProfileComplete(profileState.profile),
          isAuthenticated: true,
          isLoading: false,
          error: profileState.error,
        });
      } else {
        set({
          user: null,
          session: null,
          profile: null,
          hasCompletedProfile: false,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }

      // Escuchar cambios (token refresh, logout, etc.)
      authService.onAuthStateChange(async (_event, session) => {
        if (session) {
          const profileState = await loadProfileState(session.user.id);
          set({
            user: session.user,
            session,
            profile: profileState.profile,
            hasCompletedProfile: isProfileComplete(profileState.profile),
            isAuthenticated: true,
            error: profileState.error,
          });
        } else {
          set({
            user: null,
            session: null,
            profile: null,
            hasCompletedProfile: false,
            isAuthenticated: false,
            error: null,
          });
        }
      });
    } catch {
      set({ isLoading: false, isAuthenticated: false, profile: null, hasCompletedProfile: false });
    }
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null });
    const result = await authService.signUp(email, password);
    if (result.success) {
      let profile: UserProfile | null = null;
      let profileError: string | null = null;
      if (result.user) {
        const profileState = await loadProfileState(result.user.id);
        profile = profileState.profile;
        profileError = profileState.error;
      }
      set({
        user: result.user ?? null,
        session: result.session ?? null,
        profile,
        hasCompletedProfile: isProfileComplete(profile),
        isAuthenticated: !!result.session,
        isLoading: false,
        error: profileError,
      });
      return true;
    } else {
      set({ error: result.error ?? 'Sign up failed', isLoading: false });
      return false;
    }
  },

  signInWithGoogle: async () => {
    set({ error: null });
    const result = await authService.signInWithGoogle();
    if (!result.success) {
      set({ error: result.error ?? 'Google sign-in failed' });
      return false;
    }
    // Supabase redirige al navegador — onAuthStateChange maneja la sesión al volver
    return true;
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    const result = await authService.signIn(email, password);
    if (result.success) {
      const profileState = result.user
        ? await loadProfileState(result.user.id)
        : { profile: null, error: null };
      set({
        user: result.user ?? null,
        session: result.session ?? null,
        profile: profileState.profile,
        hasCompletedProfile: isProfileComplete(profileState.profile),
        isAuthenticated: true,
        isLoading: false,
        error: profileState.error,
      });
      return true;
    } else {
      set({ error: result.error ?? 'Sign in failed', isLoading: false });
      return false;
    }
  },

  saveProfile: async (firstName, lastName, journalName) => {
    const userId = get().user?.id;
    if (!userId) {
      set({ error: 'Not authenticated' });
      return false;
    }

    set({ isLoading: true, error: null });
    const result = await profileService.upsertProfile(userId, firstName, lastName, journalName);
    if (result.success) {
      const profile = result.profile ?? null;
      set({
        profile,
        hasCompletedProfile: isProfileComplete(profile),
        isLoading: false,
      });
      return true;
    }

    set({ error: result.error ?? 'Failed to save profile', isLoading: false });
    return false;
  },

  refreshProfile: async () => {
    const userId = get().user?.id;
    if (!userId) return;

    const profileState = await loadProfileState(userId);
    set({
      profile: profileState.profile,
      hasCompletedProfile: isProfileComplete(profileState.profile),
      error: profileState.error,
    });
  },

  signOut: async () => {
    const userId = get().user?.id;
    if (userId) {
      try {
        sessionStorage.removeItem(`emerald:dashboard:walkthrough-shown:${userId}`);
      } catch {
        // noop
      }
    }
    await authService.signOut();
    set({
      user: null,
      session: null,
      profile: null,
      hasCompletedProfile: false,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
