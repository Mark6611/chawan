import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// Fully static output. SPA fallback so client-side Dexie-backed routes work.
		// Defence in depth. Chawan makes no network requests of its own — there is
		// no fetch( left in src/ — so `connect-src 'self'` is what mechanically
		// PROVES the privacy policy's "nothing leaves the device" claim rather
		// than merely asserting it. Restoring a crafted backup was the one way to
		// make the app phone out, and this is the second lock on that door.
		//
		// Delivered as <meta http-equiv> rather than a header because the app also
		// runs in the Capacitor shell at capacitor://localhost, where Vercel's
		// response headers never arrive; a meta tag ships inside the HTML, so one
		// policy covers both. Header-only directives (frame-ancestors) go in
		// vercel.json for the web build instead.
		//
		// hash mode, not nonce: fully static SPA (ssr = false), so there is no
		// server to mint a per-request nonce. SvelteKit hashes its OWN inline
		// bootstrap, but the theme <script> in app.html is passed through verbatim
		// and must be pinned by hand. If you edit that script, recompute:
		//   the build logs the expected hash as a CSP console error at runtime.
		// A stale hash fails SOFT: the script is blocked, the pre-hydration theme
		// flash returns, and nothing else breaks.
		csp: {
			mode: 'hash',
			directives: {
				'default-src': ['self'],
				'script-src': ['self', 'sha256-rkWeCya+BH3cdwqX+1olnVlq1ABUWs3FuAJ617qNfDo='],
				// ~16 inline style="" attributes; hashes cannot cover style
				// attributes at all. Style injection is far less dangerous than
				// script, which stays locked down.
				'style-src': ['self', 'unsafe-inline'],
				// data: for backup-restored photos, blob: for the object URLs the
				// tin detail and share card create.
				'img-src': ['self', 'data:', 'blob:'],
				'font-src': ['self'],
				'connect-src': ['self'],
				'manifest-src': ['self'],
				'worker-src': ['self'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'form-action': ['none']
			}
		},
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false,
			strict: true
		})
	}
};

export default config;
