import { supabase } from './supabase';

export interface UserProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  journal_name: string;
  created_at: string;
  updated_at: string;
}

interface ProfileResult {
  success: boolean;
  profile?: UserProfile | null;
  error?: string;
}

function normalizeError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return fallback;
}

export async function getProfile(userId: string): Promise<ProfileResult> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, profile: (data as UserProfile | null) ?? null };
  } catch (error) {
    return { success: false, error: normalizeError(error, 'Failed to load profile') };
  }
}

export async function upsertProfile(userId: string, firstName: string, lastName: string, journalName: string): Promise<ProfileResult> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          journal_name: journalName.trim(),
        },
        { onConflict: 'user_id' }
      )
      .select('*')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, profile: data as UserProfile };
  } catch (error) {
    return { success: false, error: normalizeError(error, 'Failed to save profile') };
  }
}
