import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

// Single source of truth for the app version: package.json. Bumping it there
// updates the Settings "About" line (and anywhere else __APP_VERSION__ is used),
// so the displayed version can never drift out of sync again.
const pkg = JSON.parse(
	readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8')
);

export default defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			// 'prompt' — a freshly deployed service worker WAITS instead of
			// auto-activating; PwaUpdatePrompt surfaces a reload affordance so
			// the user picks up new versions deliberately. Cures the recurring
			// stale-bundle problem (old icon, missing features after deploys).
			// Pattern lifted from the coffee app (its commit 82082e1).
			registerType: 'prompt',
			manifest: {
				name: 'Chawan',
				short_name: 'Chawan',
				description: 'A personal log for matcha sessions.',
				theme_color: '#ece3d0',
				background_color: '#ece3d0',
				display: 'standalone',
				start_url: '/',
				scope: '/',
				icons: [
					// "any" (standard) and "maskable" kept as SEPARATE entries —
					// a maskable icon's full-bleed bg looks wrong when used as
					// standard, so don't share one entry across both purposes.
					{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
					{ src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
					{ src: 'icon-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
					{
						src: 'icon-maskable.svg',
						sizes: 'any',
						type: 'image/svg+xml',
						purpose: 'maskable'
					},
					{
						src: 'icon-maskable-1024.png',
						sizes: '1024x1024',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			}
		})
	]
});
