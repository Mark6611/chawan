// Supabase client — shared with the coffee app's project (same auth users,
// different tables). Env vars come from .env.local (gitignored); see
// .env.example for the shape.
//
// Optional configuration: when env vars are missing, supabase is null and
// supabaseEnabled is false. Auth surfaces guard on supabaseEnabled so the
// rest of the app keeps working in pure Phase-1 mode (Dexie-only).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseEnabled = !!(url && key);

export const supabase: SupabaseClient | null = supabaseEnabled
	? createClient(url!, key!, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: true
			}
		})
	: null;
