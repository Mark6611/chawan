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
					{
						src: 'icon.svg',
						sizes: 'any',
						type: 'image/svg+xml',
						purpose: 'any maskable'
					}
					// PNG icons (180/192/512) generated in Session 9. SVG alone suffices for dev + iOS install.
				]
			}
		})
	]
});
