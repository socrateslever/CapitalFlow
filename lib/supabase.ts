import { createClient } from '@supabase/supabase-js';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { isDev } from '../utils/isDev';

// Detecta se é acesso via portal
const isPortalAccessUrl = (() => {
  try {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.has('portal');
  } catch {
    return false;
  }
})();

/**
 * CONFIGURAÇÃO SUPABASE (ULTRA-RESILIENTE)
 * Vite substitui import.meta.env.KEY por literais no build.
 * Em desenvolvimento, acessamos via objeto para maior flexibilidade.
 */
const getSafeEnv = (key: string, fallback: string): string => {
  const env = (import.meta as any).env;
  const val = env?.[key] || '';
  if (!val && isDev) {
    console.warn(`[BOOT_WARNING] ${key} não encontrada no ambiente. Usando fallback.`);
    return fallback;
  }
  return val || fallback;
};

// Fallbacks reais do seu projeto (conforme .env.local) para garantir o boot
const REAL_URL = 'https://hzchchbxkhryextaymkn.supabase.co';
const REAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Y2hjaGJ4a2hyeWV4dGF5bWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTk2ODcsImV4cCI6MjA4MzMzNTY4N30.kX6FlTuPkl7XfycwVuZN2mI6e3ed8NaDUoyAHy9L3nc';

const SUPABASE_URL = getSafeEnv('VITE_SUPABASE_URL', REAL_URL).trim();
const SUPABASE_ANON_KEY = getSafeEnv('VITE_SUPABASE_ANON_KEY', REAL_KEY).trim();

if (isDev) {
    console.log('[BOOT] Supabase Initialized with:', {
        url: SUPABASE_URL.substring(0, 15) + '...',
        isFallback: SUPABASE_URL === REAL_URL && !(import.meta as any).env?.VITE_SUPABASE_URL
    });
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !isPortalAccessUrl,
    storageKey: 'cm_supabase_auth',
  },
  global: {
    fetch: fetchWithRetry as any
  }
});

/**
 * Utilitário para obter sessão sincronizada, evitando "lock stolen"
 * causado por múltiplas chamadas concorrentes ao getSession/getUser.
 */
let sessionPromise: Promise<{ data: { session: any }, error: any }> | null = null;

export async function getSynchronizedSession() {
  if (sessionPromise) return sessionPromise;
  
  sessionPromise = (async () => {
    try {
      return await supabase.auth.getSession();
    } finally {
      // Limpa a promise após um delay (1s) para permitir novas verificações se necessário,
      // mas bloqueando o "frenesi" inicial de boot que causa "lock stolen".
      setTimeout(() => { sessionPromise = null; }, 1000);
    }
  })();
  
  return sessionPromise;
}
