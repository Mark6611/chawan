<script lang="ts">
	// A read-only summary of one tin, for the pane beside the Tins list on an
	// unfolded iPhone Duo: its photo, how much is left, and its last bowls.
	import { repository } from '$lib/db/repository';
	import { GRADE_LABELS, REGION_LABELS, type PersonalSession, type Tin } from '$lib/db/types';
	import { tinFreshness, tinRemaining } from '$lib/tins/compute';
	import { recentBowls } from '$lib/tins/history';
	import Eyebrow from './Eyebrow.svelte';
	import Mono from './Mono.svelte';
	import Rating from './Rating.svelte';
	import ConsumptionRail from './ConsumptionRail.svelte';

	let { tin, sessions }: { tin: Tin; sessions: PersonalSession[] } = $props();

	const remaining = $derived(tinRemaining(tin, sessions));
	const fresh = $derived(tinFreshness(tin, sessions));
	const bowls = $derived(recentBowls(sessions, tin.id, 3));

	// Photo: a device-local Blob, shown through an object URL that is revoked when
	// the tin changes or the pane goes away. `stale` drops a read that resolves
	// after the selection has already moved on.
	let photoUrl = $state<string | null>(null);
	$effect(() => {
		const id = tin.id;
		let stale = false;
		let url: string | null = null;
		photoUrl = null;
		void repository
			.getTinPhoto(id)
			.then((blob) => {
				if (stale || !blob) return;
				url = URL.createObjectURL(blob);
				photoUrl = url;
			})
			.catch(() => {});
		return () => {
			stale = true;
			if (url) URL.revokeObjectURL(url);
		};
	});

	function shortDate(iso: string): string {
		return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
	}
</script>

<Eyebrow>{tin.maker}</Eyebrow>
<div class="mt-2 font-display text-[34px] leading-[1.1] text-ink italic">{tin.name}</div>
<div class="mt-2">
	<Mono size="meta" tone="muted">
		{GRADE_LABELS[tin.grade]} · {REGION_LABELS[tin.region]}{tin.cultivar
			? ` · ${tin.cultivar}`
			: ''}
	</Mono>
</div>

{#if photoUrl}
	<img
		src={photoUrl}
		alt="{tin.name} photo"
		class="mt-5 aspect-[4/3] w-full rounded-[14px] border-[0.5px] border-hairline object-cover"
	/>
{/if}

<div class="mt-6">
	<ConsumptionRail percent={1 - remaining / tin.weightGrams} />
	<div class="mt-2 flex items-baseline justify-between">
		<div class="font-mono text-[17px] text-ink">{remaining.toFixed(0)}g left</div>
		<Mono size="meta" tone="muted">of {tin.weightGrams}g</Mono>
	</div>
	{#if fresh.bowlsLeft != null}
		<div class="mt-1">
			<Mono size="meta" tone="muted">~{fresh.bowlsLeft} bowls left</Mono>
		</div>
	{/if}
	{#if fresh.days != null}
		<div class="mt-1">
			<Mono size="meta" tone="muted">opened {fresh.days}d ago</Mono>
		</div>
	{/if}
</div>

{#if bowls.length}
	<div class="mt-6">
		<Eyebrow>Last bowls</Eyebrow>
	</div>
	<ul class="mt-2 border-t border-hairline">
		{#each bowls as b (b.id)}
			<li class="flex items-baseline justify-between gap-3 border-b border-hairline py-3">
				<span class="font-mono text-[13px] text-ink">
					{shortDate(b.brewedAt)} · {b.powderGrams}g · {b.waterGrams}g · {b.waterTempC}°C
				</span>
				{#if b.rating}
					<Rating value={b.rating} size={6} />
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<div class="mt-7 flex gap-6">
	<a
		href="/tins/{tin.id}"
		class="font-mono text-[11px] tracking-[0.10em] text-tea uppercase hover:text-ink"
	>
		Open →
	</a>
	<a
		href="/tins/{tin.id}/edit"
		class="font-mono text-[11px] tracking-[0.10em] text-muted uppercase hover:text-ink"
	>
		Edit
	</a>
</div>
