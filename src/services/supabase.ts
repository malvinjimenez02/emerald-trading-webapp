import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isSupabaseConfigured) {
  console.error(
    '[Emerald] Missing Supabase environment variables.\n' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel project settings,\n' +
    'then redeploy.'
  );
}

declare global {
  interface Window {
    __supabaseClient?: ReturnType<typeof createClient>;
  }
}

let client = window.__supabaseClient;

if (!client) {
  client = createClient(
    SUPABASE_URL ?? 'https://placeholder.supabase.co',
    SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        // Abort hung auth/storage requests after 10s to prevent getSession() from blocking all writes
        fetch: (input, init) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10_000);
          return fetch(input, { ...init, signal: controller.signal }).finally(() =>
            clearTimeout(timer)
          );
        },
      },
    }
  );
  window.__supabaseClient = client;
}

// Clear cached client on HMR reload to prevent GoTrueClient lock corruption
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    delete window.__supabaseClient;
  });
}

export const supabase = client;
