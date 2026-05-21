<script lang="ts">
	// Tin list row: italic name + maker/region eyebrow + consumption rail + remaining.
	// Whole row is tappable (anchor) → /tins/[id].

	import type { PersonalSession, Tin } from '$lib/db/types';
	import { REGION_LABELS } from '$lib/db/types';
	import { tinFreshness, tinRemaining } from '$lib/tins/compute';
	import Display from './Display.svelte';
	import Mono from './Mono.svelte';
	import ConsumptionRail from './ConsumptionRail.svelte';

	let {
		tin,
		sessions = []
	}: {
		tin: Tin;
		sessions?: PersonalSession[];
	} = $props();

	const tinSessions = $derived(sessions.filter((s) => s.tinId === tin.id));
	const remaining = $derived(tinRemaining(tin, tinSessions));
	const pct = $derived(1 - remaining / tin.weightGrams);
	const fresh = $derived(tinFreshness(tin, tinSessions));
</script>

<a
	href="/tins/{tin.id}"
	class="hover:bg-surface -mx-6 block px-6 py-4 transition-colors"
	aria-label="Open {tin.name}"
>
	<div class="flex items-baseline justify-between gap-3">
		<div class="min-w-0 flex-1">
			<Display size="s" italic={false} as="h3">{tin.name}</Display>
			<div class="mt-0.5">
				<Mono size="meta" tone="muted">
					{tin.maker} · {REGION_LABELS[tin.region]}
				</Mono>
			</div>
		</div>
		<Mono size="meta" tone="muted">{remaining.toFixed(0)}/{tin.weightGrams}g</Mono>
	</div>

	<div class="mt-3">
		<ConsumptionRail percent={pct} />
	</div>

	{#if fresh.bowlsLeft != null}
		<div class="mt-2">
			<Mono size="meta" tone="faint">~{fresh.bowlsLeft} bowls left</Mono>
		</div>
	{/if}
</a>
