import { createClient } from '@supabase/supabase-js';
console.log('SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) throw new Error('supabaseUrl is required.');
if (!supabaseAnonKey) throw new Error('supabaseAnonKey is required.');

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 