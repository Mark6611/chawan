<script lang="ts">
	// Stub for the personal session form. The real form lands in Session 6
	// (tin picker, style + latte sub-fork, powder/water/temp steppers,
	// whisk tiles, rating + notes, NOW eyebrow, bottom save).

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
		<Eyebrow>Personal session</Eyebrow>
		<div class="mt-2">
			<Display size="l">Soon.</Display>
		</div>
		<p class="text-muted mt-4 text-[14px] italic">
			Tin picker · powder / water / temp steppers · style with latte sub-fork ·
			whisk tiles · rating + notes · NOW eyebrow · bottom save.
		</p>
	</div>

	<Hairline class="my-7" />

	<Mono size="meta" tone="faint">Building in Session 6.</Mono>
</main>
