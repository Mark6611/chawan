<script lang="ts">
	// New-session fork — Phase 0 decision was to keep this screen.
	// Two big tappable rows; contrasting chawan glyphs (filled vs ring-only)
	// give the choices visual distinction beyond their labels.

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import Chawan from '$lib/components/Chawan.svelte';
</script>

<main class="mx-auto max-w-md px-6 py-12 pb-28">
	<a
		href="/"
		class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
	>
		← back
	</a>

	<div class="mt-8">
		<Eyebrow>New session</Eyebrow>
		<div class="mt-2">
			<Display size="l">What did you brew?</Display>
		</div>
	</div>

	<Hairline class="my-7" />

	<a
		href="/sessions/new/personal"
		class="hover:bg-surface -mx-6 block px-6 py-8 transition-colors"
		aria-label="Log a personal session"
	>
		<div class="flex items-center justify-between gap-4">
			<div>
				<Display size="m" italic={false} as="h2">Personal</Display>
				<p class="text-muted mt-2 text-[14px] italic">
					You made it at home, from a tin you own.
				</p>
			</div>
			<Chawan size={56} />
		</div>
	</a>

	<Hairline />

	<a
		href="/sessions/new/cafe"
		class="hover:bg-surface -mx-6 block px-6 py-8 transition-colors"
		aria-label="Log a cafe session"
	>
		<div class="flex items-center justify-between gap-4">
			<div>
				<Display size="m" italic={false} as="h2">Cafe</Display>
				<p class="text-muted mt-2 text-[14px] italic">You bought a cup somewhere.</p>
			</div>
			<Chawan size={56} filled={false} />
		</div>
	</a>

	<Hairline />

	<div class="mt-8 text-center">
		<Mono size="meta" tone="faint">Choose once — defaults remember next time.</Mono>
	</div>
</main>
