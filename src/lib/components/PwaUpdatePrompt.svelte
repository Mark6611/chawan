<script lang="ts">
	// New-version prompt. registerType is 'prompt' in vite.config, so a
	// freshly deployed service worker waits instead of silently activating —
	// and surfaces here for the user to reload on their own terms. Cures the
	// stale-bundle loop where the installed PWA kept serving old code until
	// a lucky double force-quit. Pattern from the coffee app (82082e1),
	// restyled to chawan's vocabulary (mono + hairline + tea).

	import { Capacitor } from '@capacitor/core';
	import { useRegisterSW } from 'virtual:pwa-register/svelte';
	import { writable } from 'svelte/store';
	import { slide } from 'svelte/transition';

	// Inside the Capacitor WKWebView the service-worker update lifecycle is
	// meaningless (assets are bundled in the app, not server-fetched) and a
	// registered Workbox SW can cache-trap the native app on stale bundled
	// assets — the recurring "SW stale-cache" bug across the PWA-family apps.
	// App Store builds deliver updates on native, so skip SW registration there.
	// On the web isNativePlatform() is false, so this is the exact original path.
	const { needRefresh, updateServiceWorker } = Capacitor.isNativePlatform()
		? { needRefresh: writable(false), updateServiceWorker: async (_?: boolean) => {} }
		: useRegisterSW({});

	function reload() {
		void updateServiceWorker(true);
	}

	function dismiss() {
		needRefresh.set(false);
	}
</script>

{#if $needRefresh}
	<div
		transition:slide={{ duration: 180 }}
		class="fixed inset-x-0 top-0 z-[70] flex justify-center px-6 pt-[calc(env(safe-area-inset-top)+10px)]"
		role="status"
	>
		<div
			class="flex items-center gap-4 rounded-full border border-rule bg-paper px-4 py-2 shadow-[0_6px_20px_rgba(0,0,0,0.12)]"
		>
			<span class="font-mono text-[11px] tracking-[0.05em] text-ink"> A new version is ready </span>
			<button
				type="button"
				onclick={reload}
				class="font-mono text-[10.5px] font-medium tracking-[0.14em] text-tea uppercase hover:text-ink"
			>
				Reload
			</button>
			<button
				type="button"
				onclick={dismiss}
				class="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase hover:text-ink"
			>
				Later
			</button>
		</div>
	</div>
{/if}
