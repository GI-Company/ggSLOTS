
import { createClient } from '@supabase/supabase-js';

// Safely access environment variables
const getEnvVar = (key: string) => {
  let value = '';
  // 1. Try Vite / ES Modules
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      value = import.meta.env[key] || '';
    }
  } catch (e) {}

  if (value) return value;
  
  // 2. Try Node / Process
  try {
    if (typeof process !== 'undefined' && process.env) {
      value = process.env[key] || '';
    }
  } catch (e) {}
  
  return value;
};

// Check for VITE_, REACT_APP_, and NEXT_PUBLIC_ prefixes to be robust
const getVar = (base: string) => {
    return getEnvVar(`VITE_${base}`) || 
           getEnvVar(`REACT_APP_${base}`) || 
           getEnvVar(`NEXT_PUBLIC_${base}`) ||
           getEnvVar(base); // Direct access
};

const supabaseUrl = getVar('SUPABASE_URL');
const supabaseAnonKey = getVar('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase Credentials missing. App will run in Mock Mode.");
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
