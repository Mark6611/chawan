import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
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
