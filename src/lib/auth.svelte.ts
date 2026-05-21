// Module-level reactive state for the current Supabase user.
// Components read `auth.user` and `auth.ready` via the getters; both
// react to sign-in / sign-out automatically. `auth.enabled` exposes
// whether Supabase env vars were provided so UI can show a configuration
// message instead of crashing when they're absent.

import type { User } from '@supabase/supabase-js';
import { supabase, supabaseEnabled } from './supabase';

let userState = $state<User | null>(null);
let ready = $state(false);

export const auth = {
	get user() {
		return userState;
	},
	get ready() {
		return ready;
	},
	get enabled() {
		return supabaseEnabled;
	}
};

if (typeof window !== 'undefined') {
	if (supabase) {
		supabase.auth.getSession().then(({ data }) => {
			userState = data.session?.user ?? null;
			ready = true;
		});

		supabase.auth.onAuthStateChange((_event, session) => {
			userState = session?.user ?? null;
		});
	} else {
		// Supabase env vars are missing — treat as "ready, no user" so UI
		// can render the "Not configured" state instead of hanging.
		ready = true;
	}
}

export async function signOut() {
	if (!supabase) return;
	await supabase.auth.signOut();
}
