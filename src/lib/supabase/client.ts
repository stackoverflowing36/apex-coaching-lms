import { createBrowserClient } from '@supabase/ssr';

// During Vercel's static prerendering phase, NEXT_PUBLIC_ env vars may not
// be available. Provide build-safe placeholder values so the module can be
// evaluated without throwing.  The placeholders are never used at runtime
// because all Supabase calls live inside useEffect / event handlers which
// only execute in the browser where the real env vars are injected.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
