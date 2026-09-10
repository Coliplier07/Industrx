import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env and fill in your project URL/anon key.'
  );
}

// AsyncStorage falls back to `window.localStorage` on web, which doesn't
// exist during Expo Router's server-side render pass and crashes the whole
// dev server. Return empty results there instead of touching `window`.
const isServer = typeof window === 'undefined';
const ssrSafeStorage = {
  getItem: (key: string) => (isServer ? Promise.resolve(null) : AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) =>
    isServer ? Promise.resolve() : AsyncStorage.setItem(key, value),
  removeItem: (key: string) => (isServer ? Promise.resolve() : AsyncStorage.removeItem(key)),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ssrSafeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
