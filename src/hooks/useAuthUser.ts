'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/queries';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  batch_name?: string | null;
}

export function useAuthUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      try {
        const profile = await getCurrentUser(supabase);
        if (mounted) {
          setUser(profile);
        }
      } catch (err) {
        console.error('Failed to fetch auth user:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      if (session?.user) {
        const profile = await getCurrentUser(supabase);
        if (mounted) setUser(profile);
      } else {
        if (mounted) setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase]);

  return { user, loading };
}
