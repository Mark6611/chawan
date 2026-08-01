import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig, type Plugin } from 'vite';
import { transform as transformCss } from 'lightningcss';

// Single source of truth for the app version: package.json. Bumping it there
// updates the Settings "About" line (and anywhere else __APP_VERSION__ is used),
// so the displayed version can never drift out of sync again.
const pkg = JSON.parse(
	readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8')
);

// iOS 15 browser floor (same as the coffee sibling): Tailwind v4 emits
// media-query RANGE syntax (`@media (width >= 40rem)`), which Safari only
// understands from 16.4 — on older WebKit the whole media block is dropped
// silently. Vite's own `build.cssMinify: 'lightningcss'` does NOT reach
// Tailwind's output (verified: identical asset hash — @tailwindcss/vite runs
// its own internal optimize pass with its own targets), so we lower the floor
// ourselves in a post `generateBundle` pass over every emitted CSS asset.
// Lightning CSS rewrites range syntax to min-/max-width, adds needed -webkit-
// prefixes, and resolves guarded color-mix() to static lab() (Safari 15+).
// Guarded end-to-end by scripts/verify-bundle-css.mjs in CI.
// Lightning CSS version encoding: major << 16 | minor << 8.
const IOS_FLOOR = 15 << 16;

function lowerCssToIos15Floor(): Plugin {
	return {
		name: 'lower-css-to-ios15-floor',
		apply: 'build',
		enforce: 'post',
		generateBundle(_options, bundle) {
			for (const [fileName, entry] of Object.entries(bundle)) {
				if (entry.type !== 'asset' || !fileName.endsWith('.css')) continue;
				const result = transformCss({
					filename: fileName,
					code: Buffer.from(entry.source),
					minify: true,
					targets: { safari: IOS_FLOOR, ios_saf: IOS_FLOOR }
				});
				entry.source = result.code.toString();
			}
		}
	};
}

export default defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	},
	plugins: [
		tailwindcss(),
		lowerCssToIos15Floor(),
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
