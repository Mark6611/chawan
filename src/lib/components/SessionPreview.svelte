<script lang="ts">
	// A read-only summary of one session, for the pane beside the Sessions list on
	// an unfolded iPhone Duo. Everything here is also on the session's own page;
	// the pane saves the trip there and back while you scan the list.
	import {
		MILK_LABELS,
		REGION_LABELS,
		WHISK_LABELS,
		isPersonal,
		type Session,
		type Tin
	} from '$lib/db/types';
	import { formatRatio, styleLabel } from '$lib/sessions/compute';
	import { formatPrice } from '$lib/sessions/currency';
	import Eyebrow from './Eyebrow.svelte';
	import Mono from './Mono.svelte';
	import Rating from './Rating.svelte';

	let {
		session,
		tinsById = {}
	}: {
		session: Session;
		tinsById?: Record<string, Tin>;
	} = $props();

	const when = $derived(
		new Date(session.brewedAt).toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		})
	);
	const facts = $derived.by((): [string, string][] => {
		if (isPersonal(session)) {
			const rows: [string, string][] = [
				['Powder', `${session.powderGrams}g`],
				['Water', `${session.waterGrams}g`],
				['Temp', `${session.waterTempC}°C`],
				['Ratio', formatRatio(session)]
			];
			if (session.whisk) rows.push(['Whisk', WHISK_LABELS[session.whisk]]);
			if (session.milk) rows.push(['Milk', MILK_LABELS[session.milk]]);
			return rows;
		}
		const rows: [string, string][] = [['Region', REGION_LABELS[session.region]]];
		if (session.maker) rows.push(['Matcha', session.maker]);
		if (session.milk) rows.push(['Milk', MILK_LABELS[session.milk]]);
		if (session.priceCents != null)
			rows.push(['Price', formatPrice(session.priceCents, session.priceCurrency ?? 'THB')]);
		return rows;
	});
</script>

<Eyebrow>{styleLabel(session)} · {when}</Eyebrow>
<div
	class="mt-2 font-display text-[34px] leading-[1.1] text-ink {isPersonal(session) ? '' : 'italic'}"
>
	{isPersonal(session) ? (tinsById[session.tinId]?.name ?? 'Tin') : session.cafeName}
</div>
{#if session.rating}
	<div class="mt-3">
		<Rating value={session.rating} size={8} />
	</div>
{/if}

<dl class="mt-6 border-t border-hairline">
	{#each facts as [label, value] (label)}
		<div class="flex items-baseline justify-between gap-4 border-b border-hairline py-3">
			<dt><Mono size="meta" tone="muted">{label}</Mono></dt>
			<dd class="font-mono text-[15px] text-ink">{value}</dd>
		</div>
	{/each}
</dl>

{#if session.notes}
	<p class="mt-5 text-[15px] leading-[1.5] text-ink italic">{session.notes}</p>
{/if}

<div class="mt-7 flex gap-6">
	<a
		href="/sessions/{session.id}"
		class="font-mono text-[11px] tracking-[0.10em] text-tea uppercase hover:text-ink"
	>
		Open →
	</a>
	<a
		href="/sessions/{session.id}/edit"
		class="font-mono text-[11px] tracking-[0.10em] text-muted uppercase hover:text-ink"
	>
		Edit
	</a>
</div>
