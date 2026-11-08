import { createClient } from '@supabase/supabase-js';

function read(name: string): string {
    try {
        if (typeof process !== 'undefined' && process.env?.[name]) return process.env[name] || '';
    } catch {
        /* Browser bundles have no process.env. */
    }
    return '';
}

// Static Vite keys are filled at build time from VITE_* or the Vercel Supabase integration (STORAGE_*).
const viteUrl = import.meta.env.VITE_SUPABASE_URL || '';
const viteAnon = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseUrl = viteUrl
    || read('VITE_SUPABASE_URL')
    || read('STORAGE_SUPABASE_URL')
    || read('NEXT_PUBLIC_STORAGE_SUPABASE_URL')
    || read('SUPABASE_URL')
    || 'https://sorqdvmpehxjfstunzgo.supabase.co';

const supabaseAnonKey = viteAnon
    || read('VITE_SUPABASE_ANON_KEY')
    || read('STORAGE_SUPABASE_ANON_KEY')
    || read('NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY')
    || read('STORAGE_SUPABASE_PUBLISHABLE_KEY')
    || read('NEXT_PUBLIC_STORAGE_SUPABASE_PUBLISHABLE_KEY')
    || read('SUPABASE_ANON_KEY')
    || read('SUPABASE_KEY');

export const isSupabaseConfigured = Boolean(supabaseAnonKey);

if (!isSupabaseConfigured) {
    console.warn('Supabase key missing. Games will run on this device until a project key is set.');
}

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
