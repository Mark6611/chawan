<script lang="ts">
	// Guard for the /dev/* exhibit routes (component kit, flavor-chart
	// exhibit). These are development references, not user-facing surfaces —
	// they're unlinked from the app chrome but the URLs are guessable. In a
	// production build (import.meta.env.DEV === false) any visit bounces to
	// home. In `npm run dev` they render normally.

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let { children } = $props();

	onMount(() => {
		if (!import.meta.env.DEV) goto('/', { replaceState: true });
	});
</script>

{#if import.meta.env.DEV}
	{@render children()}
{:else}
	<main class="mx-auto max-w-md px-6 py-20 text-center">
		<p class="text-muted font-mono text-[11px] tracking-[0.14em] uppercase">Redirecting…</p>
	</main>
{/if}
