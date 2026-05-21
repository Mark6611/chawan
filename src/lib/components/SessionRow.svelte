<script lang="ts">
	// Sessions-feed row. Renders distinct templates per `kind` so personal
	// vs cafe are distinguishable at a glance (tin name upright; cafe name
	// italic; brew params on personal; region/milk/price on cafe). Whole
	// row is a link to /sessions/[id].

	import {
		MILK_LABELS,
		REGION_LABELS,
		STYLE_LABELS,
		isPersonal,
		type Session,
		type Tin
	} from '$lib/db/types';
	import { formatPrice } from '$lib/sessions/currency';
	import Mono from './Mono.svelte';
	import Rating from './Rating.svelte';

	let {
		session,
		tinsById = {}
	}: {
		session: Session;
		tinsById?: Record<string, Tin>;
	} = $props();

	function timeOfDay(iso: string): string {
		const d = new Date(iso);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}
</script>

<a
	href="/sessions/{session.id}"
	class="hover:bg-surface border-hairline -mx-6 block border-b px-6 py-3 transition-colors"
>
	<div class="flex items-baseline justify-between gap-3">
		<Mono size="meta" tone="muted">
			{STYLE_LABELS[session.style]} · {timeOfDay(session.brewedAt)}
		</Mono>
		{#if session.rating}
			<Rating value={session.rating} size={6} />
		{/if}
	</div>

	<div class="mt-1">
		{#if isPersonal(session)}
			{@const tinName = tinsById[session.tinId]?.name ?? '—'}
			<span class="text-ink font-display text-[18px]">{tinName}</span>
			<span class="text-muted ml-1 font-mono text-[11px]">
				· {session.powderGrams}g · {session.waterGrams}g · {session.waterTempC}°C
			</span>
		{:else}
			<span class="text-ink font-display text-[18px] italic">{session.cafeName}</span>
			<span class="text-muted ml-1 font-mono text-[11px]">
				· {REGION_LABELS[session.region]}{#if session.milk} · {MILK_LABELS[session.milk]} milk{/if}{#if session.priceCents != null} · {formatPrice(session.priceCents, session.priceCurrency ?? 'USD')}{/if}
			</span>
		{/if}
	</div>
</a>
