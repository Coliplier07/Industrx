import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  companyId: string;
  fullName: string;
  phone: string | null;
  role: 'admin' | 'pm' | 'employee';
  managerId: string | null;
  avatarPath: string | null;
  // Private-bucket files need a freshly-signed URL to actually display;
  // null until fetchProfile() fills it in.
  avatarSignedUrl: string | null;
}

interface ProfileContextValue {
  profile: Profile | null;
  loading: boolean;
  // Whether there's a signed-in Supabase user at all — true even before a
  // profiles row exists yet (e.g. mid-signup, before create_company_and_admin
  // runs). Used to reactively guard the (dashboard) route group in the root
  // layout via Stack.Protected, instead of imperative navigation from deep
  // inside the Tabs navigator, which has proven unreliable.
  hasSession: boolean;
  refresh: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

function mapProfileRow(row: any): Profile {
  return {
    id: row.id,
    companyId: row.company_id,
    fullName: row.full_name ?? '',
    phone: row.phone,
    role: row.role,
    managerId: row.manager_id,
    avatarPath: row.avatar_path,
    avatarSignedUrl: null,
  };
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  // Guards against a stale, slower fetch (e.g. one started for the previous
  // account) resolving after a newer one and overwriting it with the wrong
  // user's data. Only the most recently-started fetch is allowed to apply
  // its result.
  const fetchIdRef = useRef(0);

  const fetchProfile = async () => {
    const fetchId = ++fetchIdRef.current;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (fetchIdRef.current !== fetchId) return;

    setHasSession(!!user);

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

    if (fetchIdRef.current !== fetchId) return;

    if (error || !data) {
      // No profile row yet is expected right after signup, before
      // create_company_and_admin has run — not a real error.
      if (error) console.error('Failed to load profile:', error.message);
      setProfile(null);
      setLoading(false);
      return;
    }

    let mapped = mapProfileRow(data);
    if (mapped.avatarPath) {
      const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(mapped.avatarPath, 3600);
      if (fetchIdRef.current !== fetchId) return;
      mapped = { ...mapped, avatarSignedUrl: signed?.signedUrl ?? null };
    }

    setProfile(mapped);
    setLoading(false);
  };

  useEffect(() => {
    // Initial data fetch on mount, not derived state — the rule below is
    // meant for the "sync state from props" anti-pattern, not this.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setHasSession(true);
        setLoading(true);
        fetchProfile();
      } else if (event === 'SIGNED_OUT') {
        // Invalidate any fetch still in flight for the account we're
        // leaving, so it can't land after this and repopulate stale data.
        // loading is false (not true) here — there's nothing left to fetch
        // once signed out, so anything gating on "loading" (e.g. the
        // dashboard's tab bar) won't spin forever if it's still mounted
        // for a moment during the sign-out navigation.
        // hasSession flips synchronously here (not inside fetchProfile,
        // which is async) so Stack.Protected in the root layout reacts to
        // sign-out immediately and unmounts the (dashboard) group itself,
        // rather than relying on an imperative navigation call to escape
        // several levels of nested navigators — which is what was actually
        // getting stuck.
        fetchIdRef.current += 1;
        setProfile(null);
        setLoading(false);
        setHasSession(false);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, loading, hasSession, refresh: fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
