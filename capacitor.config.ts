import type { CapacitorConfig } from '@capacitor/cli';

// Native shell config — same pattern as buffy (the household's working
// Capacitor app). The web build is bundled into the app (webDir), so the
// native app works fully offline; Supabase sync reaches the network the
// same way the PWA does. No dual-adapter split needed: chawan is already
// adapter-static with an index.html fallback, so one build serves web
// and native.

const config: CapacitorConfig = {
	appId: 'com.mark.chawan',
	appName: 'Chawan',
	webDir: 'build',
	ios: {
		// Day paper — matches the boot script's default first paint so there's
		// no flash between webview background and the app's own background.
		backgroundColor: '#ece3d0'
	},
	plugins: {
		SplashScreen: {
			// Hold the splash until the web view has painted; +layout calls
			// SplashScreen.hide() on mount. Kills the gap between splash-dismiss
			// and first paint (buffy's pattern).
			launchAutoHide: false,
			backgroundColor: '#161b16', // deep earth — matches the ensō splash artwork
			showSpinner: false
		}
	}
};

export default config;
