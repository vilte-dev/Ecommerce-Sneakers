import { createClient } from '@supabase/supabase-js';

/** Cliente de Supabase. Solo usa la anon key: la seguridad real vive en RLS. */
export function createSneakersClient(storageKey) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env de la raíz.');
  }
  return createClient(url, key, { auth: { storageKey, persistSession: true, autoRefreshToken: true } });
}
