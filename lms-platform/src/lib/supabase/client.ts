import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (client) return client;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gnoaegjqazibdchorpuo.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdub2FlZ2pxYXppYmRjaG9ycHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NzM3NTAsImV4cCI6MjEwMzA0OTc1MH0.YJhqRTU_TZAa0l3W8qFxK-_66yYnDbXtOQRDMcLyJmo';

  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
