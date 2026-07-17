import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_KEY || '';

export const supabase = url && key ? createClient(url, key) : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}
