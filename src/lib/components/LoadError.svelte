<script lang="ts">
	// Shown when a route's load() rejects (e.g. IndexedDB blocked in Safari
	// private mode, storage quota, a corrupt Dexie DB). Without this a failed
	// read leaves the page pinned on "Loading…" forever. Offers a retry that
	// re-runs the route's load().
	import Mono from './Mono.svelte';

	let {
		onretry,
		message = "Couldn't load this — your browser may be blocking local storage."
	}: { onretry?: () => void; message?: string } = $props();
</script>

<div class="mt-16 flex flex-col items-center text-center">
	<Mono size="meta" tone="muted">{message}</Mono>
	{#if onretry}
		<button
			type="button"
			onclick={onretry}
			class="mt-4 font-mono text-[11px] tracking-[0.10em] text-tea uppercase hover:text-ink"
		>
			Try again
		</button>
	{/if}
</div>
