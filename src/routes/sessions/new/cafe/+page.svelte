<script lang="ts">
	// Stub for the cafe session form. The real form lands in Session 7
	// (cafe name autocomplete, optional matcha maker, region, style + latte
	// sub-fork with milk, price keypad with currency, rating + notes).

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
</script>

<main class="mx-auto max-w-md px-6 py-12 pb-28">
	<a
		href="/sessions/new"
		class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
	>
		← back
	</a>

	<div class="mt-8">
		<Eyebrow>Cafe session</Eyebrow>
		<div class="mt-2">
			<Display size="l">Soon.</Display>
		</div>
		<p class="text-muted mt-4 text-[14px] italic">
			Cafe name autocomplete · optional matcha brand · region · style with
			latte sub-fork · price keypad · rating + notes.
		</p>
	</div>

	<Hairline class="my-7" />

	<Mono size="meta" tone="faint">Building in Session 7.</Mono>
</main>
