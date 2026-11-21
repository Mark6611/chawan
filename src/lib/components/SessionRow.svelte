<script lang="ts">
	// Sessions-feed row. Renders distinct templates per `kind` so personal
	// vs cafe are distinguishable at a glance (tin name upright; cafe name
	// italic; brew params on personal; region/milk/price on cafe). Whole
	// row is a link to /sessions/[id].

	import { MILK_LABELS, REGION_LABELS, isPersonal, type Session, type Tin } from '$lib/db/types';
	import { formatPrice } from '$lib/sessions/currency';
	import { styleLabel } from '$lib/sessions/compute';
	import { duo } from '$lib/split.svelte';
	import Mono from './Mono.svelte';
	import Rating from './Rating.svelte';

	let {
		session,
		tinsById = {},
		onselect,
		selected = false
	}: {
		session: Session;
		tinsById?: Record<string, Tin>;
		/** When a preview pane sits beside the list (unfolded iPhone Duo), a tap
		 *  fills the pane instead of leaving the list. Everywhere else the row is
		 *  the plain link it has always been. */
		onselect?: (id: string) => void;
		selected?: boolean;
	} = $props();

	function onclick(e: MouseEvent) {
		if (!onselect || !duo.split) return;
		e.preventDefault();
		onselect(session.id);
	}

	function timeOfDay(iso: string): string {
		const d = new Date(iso);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}
</script>

<a
	href="/sessions/{session.id}"
	{onclick}
	aria-current={selected ? 'true' : undefined}
	class="-mx-6 block border-b border-hairline px-6 py-3 transition-colors hover:bg-surface {selected
		? 'bg-surface'
		: ''}"
>
	<div class="flex items-baseline justify-between gap-3">
		<Mono size="meta" tone="muted">
			{styleLabel(session)} · {timeOfDay(session.brewedAt)}
		</Mono>
		{#if session.rating}
			<Rating value={session.rating} size={6} />
		{/if}
	</div>

	<div class="mt-1">
		{#if isPersonal(session)}
			{@const tinName = tinsById[session.tinId]?.name ?? '—'}
			<span class="font-display text-[18px] text-ink">{tinName}</span>
			<span class="ml-1 font-mono text-[11px] text-muted">
				· {session.powderGrams}g · {session.waterGrams}g · {session.waterTempC}°C
			</span>
		{:else}
			<span class="font-display text-[18px] text-ink italic">{session.cafeName}</span>
			<span class="ml-1 font-mono text-[11px] text-muted">
				· {REGION_LABELS[session.region]}{#if session.milk}
					· {MILK_LABELS[session.milk]} milk{/if}{#if session.priceCents != null}
					· {formatPrice(session.priceCents, session.priceCurrency ?? 'THB')}{/if}
			</span>
		{/if}
	</div>
</a>
