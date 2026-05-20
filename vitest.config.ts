import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Standalone Vitest config (does not load the SvelteKit Vite plugin).
// Pure-function tests only at this stage — Dexie integration tests will
// need fake-indexeddb later when we have repo tests.
export default defineConfig({
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib')
		}
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'node'
	}
});
