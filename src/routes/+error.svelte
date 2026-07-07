<script lang="ts">
	// Root error boundary. SvelteKit renders this when a load() or a
	// component render throws anywhere in the tree — without it, an
	// unexpected throw white-screens the whole app with no way back.
	import { page } from '$app/state';
	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';

	const isNotFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{isNotFound ? 'Not found' : 'Something went wrong'} · Chawan</title>
</svelte:head>

<main class="mx-auto max-w-md px-6 py-24 text-center">
	<Eyebrow>{isNotFound ? 'Not found' : 'Something went wrong'}</Eyebrow>
	<div class="mt-3">
		<Display size="l">{isNotFound ? 'This page wandered off.' : 'A hiccup in the app.'}</Display>
	</div>
	<p class="mx-auto mt-4 max-w-[30ch] text-[14px] text-muted italic">
		{isNotFound
			? "The page you're after isn't here."
			: 'An unexpected error interrupted the app. Reloading usually clears it.'}
	</p>
	<div class="mt-8">
		<a href="/" class="font-mono text-[11px] tracking-[0.10em] text-tea uppercase hover:text-ink">
			← back to today
		</a>
	</div>
	{#if page.error?.message && !isNotFound}
		<div class="mt-10">
			<Mono size="meta" tone="faint">{page.error.message}</Mono>
		</div>
	{/if}
</main>
