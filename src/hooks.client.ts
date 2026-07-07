import type { HandleClientError } from '@sveltejs/kit';

// Central client-side error handler. Runs when an unexpected error is thrown
// during load or rendering. Logs for diagnosis and returns the shape used by
// +error.svelte as `page.error`. (Kept minimal — no third-party reporting; a
// beta build can wire one in here later without touching component code.)
export const handleError: HandleClientError = ({ error, event }) => {
	console.error('[client error]', event?.url?.pathname ?? '', error);
	return {
		message: error instanceof Error ? error.message : 'An unexpected error occurred.'
	};
};
