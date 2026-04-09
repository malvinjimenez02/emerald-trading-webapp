import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Log clearly so the error shows in Vercel's function logs / browser console,
  // but do NOT throw here — a module-level throw crashes before React mounts,
  // leaving a blank screen with no visible feedback.
  console.error(
    '[Emerald] Missing Supabase environment variables.\n' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel project settings,\n' +
    'then redeploy.'
  );
}

export const supabase = createClient(
  SUPABASE_URL ?? 'https://missing-url.supabase.co',
  SUPABASE_ANON_KEY ?? 'missing-anon-key',
);
