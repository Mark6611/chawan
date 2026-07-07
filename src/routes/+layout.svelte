<script lang="ts">
	// Fonts — self-hosted via Fontsource so the PWA stays offline-friendly.
	// Scoped to latin + latin-ext only: the full aggregate imports shipped
	// cyrillic / greek / vietnamese subsets we never render (~1.2 MB of
	// woff2). latin-ext is required — it carries the ō macron in maker
	// names like "Marukyu Kōyamaen" and cultivars like "Gokō". Kanji
	// (永寿, 又玄, …) were never in these fonts; they render via the OS
	// CJK fallback either way, so trimming doesn't affect them.
	//
	// Cormorant Garamond (display): regular + italic, multiple weights.
	import '@fontsource/cormorant-garamond/latin-400.css';
	import '@fontsource/cormorant-garamond/latin-500.css';
	import '@fontsource/cormorant-garamond/latin-600.css';
	import '@fontsource/cormorant-garamond/latin-400-italic.css';
	import '@fontsource/cormorant-garamond/latin-ext-400.css';
	import '@fontsource/cormorant-garamond/latin-ext-500.css';
	import '@fontsource/cormorant-garamond/latin-ext-600.css';
	import '@fontsource/cormorant-garamond/latin-ext-400-italic.css';
	// EB Garamond (body): regular + italic.
	import '@fontsource/eb-garamond/latin-400.css';
	import '@fontsource/eb-garamond/latin-400-italic.css';
	import '@fontsource/eb-garamond/latin-ext-400.css';
	import '@fontsource/eb-garamond/latin-ext-400-italic.css';
	// IBM Plex Mono (mono): light/regular/medium for the numeric scale.
	import '@fontsource/ibm-plex-mono/latin-300.css';
	import '@fontsource/ibm-plex-mono/latin-400.css';
	import '@fontsource/ibm-plex-mono/latin-500.css';
	import '@fontsource/ibm-plex-mono/latin-ext-300.css';
	import '@fontsource/ibm-plex-mono/latin-ext-400.css';
	import '@fontsource/ibm-plex-mono/latin-ext-500.css';

	import './layout.css';

	import LinkRail from '$lib/components/LinkRail.svelte';
	import PwaUpdatePrompt from '$lib/components/PwaUpdatePrompt.svelte';
	import { preferences } from '$lib/preferences.svelte';
	import { auth } from '$lib/auth.svelte';
	import { syncState } from '$lib/sync.svelte';

	import { onMount } from 'svelte';

	onMount(() => {
		// Re-read in case SSR gave us the day fallback before localStorage
		// was available. Also applies the theme attribute (boot script in
		// app.html already did this synchronously before paint, but this
		// guarantees consistency after preferences.setTheme() calls).
		preferences.init();

		// Native shell (Capacitor): the splash is configured with
		// launchAutoHide=false and released here, after first paint — no
		// white gap between splash and app. Dynamic import so the web
		// bundle doesn't pay for the plugin; isNativePlatform() is false
		// in browsers so this whole branch no-ops on the web.
		void (async () => {
			const { Capacitor } = await import('@capacitor/core');
			if (Capacitor.isNativePlatform()) {
				const { SplashScreen } = await import('@capacitor/splash-screen');
				await SplashScreen.hide();
			}
		})();
	});

	// Native status bar: track the in-app day/night theme so the clock/battery
	// glyphs stay legible against the app background. The toggle is decoupled
	// from the iOS system appearance, so without this a phone in system Light
	// mode with the app in Night renders dark glyphs on dark paper. No-ops on
	// the web (isNativePlatform() is false, so the plugin is never imported).
	$effect(() => {
		const night = preferences.theme === 'night'; // tracked dependency
		void (async () => {
			const { Capacitor } = await import('@capacitor/core');
			if (!Capacitor.isNativePlatform()) return;
			const { StatusBar, Style } = await import('@capacitor/status-bar');
			try {
				await StatusBar.setStyle({ style: night ? Style.Dark : Style.Light });
			} catch {
				// StatusBar plugin unavailable — ignore.
			}
		})();
	});

	let { children } = $props();
</script>

<button
	type="button"
	onclick={() => preferences.toggleTheme()}
	class="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] right-3 z-50 grid h-9 w-9 place-items-center rounded-full border border-rule bg-transparent text-ink transition-colors hover:bg-surface"
	aria-label="Toggle theme (current: {preferences.theme})"
	title="Theme: {preferences.theme}"
>
	{#if preferences.theme === 'night'}
		<!-- moon -->
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
		</svg>
	{:else}
		<!-- sun -->
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
			/>
		</svg>
	{/if}
</button>

<!-- Sync indicator — only surfaces when actively syncing OR an error
     is current. Subtle by design: silence when everything's fine. -->
{#if auth.user && (syncState.syncing || syncState.lastError)}
	<a
		href="/settings"
		class="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] right-14 z-50 grid h-9 w-9 place-items-center rounded-full border border-rule bg-paper transition-colors hover:bg-surface"
		aria-label={syncState.syncing ? 'Syncing in progress' : 'Sync error — tap for details'}
		title={syncState.syncing ? 'Syncing…' : 'Sync error'}
	>
		<span class="h-2 w-2 rounded-full {syncState.syncing ? 'animate-pulse bg-warn' : 'bg-danger'}"
		></span>
	</a>
{/if}

<PwaUpdatePrompt />

{@render children()}

<LinkRail />
