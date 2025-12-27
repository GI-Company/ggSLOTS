
import { createClient } from '@supabase/supabase-js';

// Safely access environment variables to prevent crashes in environments where import.meta.env is undefined
const getEnvVar = (key: string) => {
  let value = '';

  // 1. Try Vite / ES Modules (import.meta.env)
  try {
    // Check if import.meta exists first
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      value = import.meta.env[key] || '';
    }
  } catch (e) {
    // ignore
  }

  if (value) return value;
  
  // 2. Try Node / Webpack / CRA (process.env)
  try {
    if (typeof process !== 'undefined' && process.env) {
      value = process.env[key] || '';
    }
  } catch (e) {
    // ignore
  }
  
  return value;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('REACT_APP_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('REACT_APP_SUPABASE_ANON_KEY');

// We export a null client if env vars are missing so the App knows to use the Mock Service
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
