import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchIsAdmin } from '@/services/admin';

export type AdminAccess = 'checking' | 'signed-out' | 'denied' | 'granted';

export function useAdminAccess(): AdminAccess {
  const [access, setAccess] = useState<AdminAccess>('checking');

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!session) {
          setAccess('signed-out');
          return;
        }
        setAccess('checking');
        try {
          const isAdmin = await fetchIsAdmin();
          setAccess(isAdmin ? 'granted' : 'denied');
        } catch {
          setAccess('denied');
        }
      })();
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return access;
}
