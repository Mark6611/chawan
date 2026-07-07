// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

/// <reference types="vite-plugin-pwa/svelte" />
/// <reference types="vite-plugin-pwa/info" />

declare global {
	// Injected by Vite `define` from package.json — see vite.config.ts.
	const __APP_VERSION__: string;

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
