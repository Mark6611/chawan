// Supabase client — shared with the coffee app's project (same auth users,
// different tables). Env vars come from .env.local (gitignored); see
// .env.example for the shape.
//
// Optional configuration: when env vars are missing, supabase is null and
// supabaseEnabled is false. Auth surfaces guard on supabaseEnabled so the
// rest of the app keeps working in pure Phase-1 mode (Dexie-only).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ─── Local-only mode ────────────────────────────────────────────────────
// App Review direction (2026-07-17, after the 5.1.1 Data Collection
// rejection): Chawan ships local-only, like Buffy. Flipping this to true
// restores the whole sign-in/sync surface (auth pages, settings section,
// sync listeners) — nothing else was removed. While false, no Supabase
// client is ever created, so even a device with a previously persisted
// session cannot authenticate or sync, and App Privacy is honestly
// "Data Not Collected".
const SYNC_ENABLED = false;

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseEnabled = SYNC_ENABLED && !!(url && key);

export const supabase: SupabaseClient | null = supabaseEnabled
	? createClient(url!, key!, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: true
			}
		})
	: null;
