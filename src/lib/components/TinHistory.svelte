<script lang="ts">
	// What this tin's past bowls say about the next one: the last few as they were
	// made, and the average of the ones rated well. Read-only.
	//
	// Shown two ways, never in one pose only: as the pane beside the session form
	// on an unfolded iPhone Duo, and inside a sheet from the form's History button
	// everywhere else.
	import { STYLE_LABELS, type PersonalSession, type Style, type Tin } from '$lib/db/types';
	import { recentBowls, whatWorked } from '$lib/tins/history';
	import { tinRemaining } from '$lib/tins/compute';
	import Eyebrow from './Eyebrow.svelte';
	import Mono from './Mono.svelte';
	import Rating from './Rating.svelte';

	let {
		tin,
		sessions,
		style
	}: {
		tin: Tin | undefined;
		sessions: PersonalSession[];
		style: Style;
	} = $props();

	const bowls = $derived(tin ? recentBowls(sessions, tin.id) : []);
	const worked = $derived(tin ? whatWorked(sessions, tin.id, style) : null);
	const remaining = $derived(tin ? tinRemaining(tin, sessions) : 0);

	function shortDate(iso: string): string {
		return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
	}
</script>

{#if !tin}
	<Eyebrow>This tin</Eyebrow>
	<p class="mt-3 text-[14px] text-muted italic">Pick a tin to see how its last bowls went.</p>
{:else}
	<Eyebrow>This tin</Eyebrow>
	<div class="mt-2 font-display text-[26px] leading-[1.15] text-ink">{tin.name}</div>
	<div class="mt-1">
		<Mono size="meta" tone="muted">
			{tin.maker} · {remaining.toFixed(0)} of {tin.weightGrams}g left
		</Mono>
	</div>

	{#if worked}
		<div class="mt-6 rounded-[14px] border-[0.5px] border-rule px-4 py-3">
			<Eyebrow>What worked · {STYLE_LABELS[worked.style]}</Eyebrow>
			<div class="mt-2 font-mono text-[17px] text-ink">
				{worked.powderGrams}g · {worked.waterGrams}g · {worked.waterTempC}°C
			</div>
			<div class="mt-1">
				<Mono size="meta" tone="muted">average of {worked.bowls} bowls you rated 4 or more</Mono>
			</div>
		</div>
	{/if}

	<div class="mt-6">
		<Eyebrow>Last bowls</Eyebrow>
	</div>
	{#if bowls.length === 0}
		<p class="mt-3 text-[14px] text-muted italic">No bowls from this tin yet.</p>
	{:else}
		<ul class="mt-2 border-t border-hairline">
			{#each bowls as b (b.id)}
				<li class="border-b border-hairline py-3">
					<div class="flex items-baseline justify-between gap-3">
						<Mono size="meta" tone="muted">{shortDate(b.brewedAt)} · {STYLE_LABELS[b.style]}</Mono>
						{#if b.rating}
							<Rating value={b.rating} size={6} />
						{/if}
					</div>
					<div class="mt-1 font-mono text-[14px] text-ink">
						{b.powderGrams}g · {b.waterGrams}g · {b.waterTempC}°C
					</div>
					{#if b.notes}
						<p class="mt-1 text-[13px] text-muted italic">{b.notes}</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
{/if}
