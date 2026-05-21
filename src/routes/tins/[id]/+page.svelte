<script lang="ts">
	// Tin detail.
	// Hero: maker (eyebrow) + name (display XL italic) + grade/region/cultivar meta.
	// Then: consumption rail with per-session ticks + remaining + estimated bowls left.
	// Then: freshness signal (≤14d / ≤21d / >21d windows).
	// Then: sessions from this tin, newest first.
	// Then: archive / unarchive toggle.

	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { repository } from '$lib/db/repository';
	import {
		GRADE_LABELS,
		REGION_LABELS,
		STYLE_LABELS,
		type PersonalSession,
		type Tin
	} from '$lib/db/types';
	import { tinFreshness, tinRemaining } from '$lib/tins/compute';
	import { formatTimeAgo } from '$lib/sessions/compute';

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import ConsumptionRail from '$lib/components/ConsumptionRail.svelte';
	import Rating from '$lib/components/Rating.svelte';
	import PrimaryButton from '$lib/components/PrimaryButton.svelte';

	// `undefined` = still loading; `null` = lookup completed and tin doesn't exist.
	let tin = $state<Tin | null | undefined>(undefined);
	let sessions = $state<PersonalSession[]>([]);

	const id = $derived(page.params.id);

	async function load() {
		if (!id) return;
		const [t, s] = await Promise.all([
			repository.getTin(id),
			repository.listSessionsByTin(id)
		]);
		tin = t ?? null;
		// Newest first for the history list.
		sessions = s.slice().sort((a, b) => b.brewedAt.localeCompare(a.brewedAt));
	}
	onMount(load);

	const remaining = $derived(tin ? tinRemaining(tin, sessions) : 0);
	const pct = $derived(tin ? 1 - remaining / tin.weightGrams : 0);
	const fresh = $derived(tin ? tinFreshness(tin, sessions) : null);

	// Per-session tick positions on the rail.
	// Each tick sits at the *cumulative* used / weight, oldest first.
	const ticks = $derived.by(() => {
		if (!tin || sessions.length === 0) return undefined;
		const asc = sessions.slice().reverse(); // sessions is desc; flip for cumulative
		const result: number[] = [];
		let used = 0;
		for (const s of asc) {
			used += s.powderGrams ?? 0;
			result.push(Math.min(1, used / tin.weightGrams));
		}
		return result;
	});

	// Freshness window per docs/design-handoff/flow-review.md §5.
	const freshLabel = $derived.by(() => {
		if (!fresh?.days && fresh?.days !== 0) return null;
		if (fresh.days <= 14) return { label: 'Open recently', tone: 'data' as const };
		if (fresh.days <= 21) return { label: 'Approaching window', tone: 'muted' as const };
		return { label: 'Past peak window', tone: 'faint' as const };
	});

	let busy = $state(false);

	async function archive() {
		if (!tin || busy) return;
		busy = true;
		await repository.archiveTin(tin.id);
		await load();
		busy = false;
	}

	async function unarchive() {
		if (!tin || busy) return;
		busy = true;
		await repository.unarchiveTin(tin.id);
		await load();
		busy = false;
	}
</script>

<main class="mx-auto max-w-md px-6 py-12 pb-28">
	<a
		href="/tins"
		class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
	>
		← back
	</a>

	{#if tin === undefined}
		<div class="mt-16 text-center">
			<Mono size="meta" tone="muted">Loading…</Mono>
		</div>
	{:else if tin === null}
		<div class="mt-16 text-center">
			<Display size="m">Tin not found.</Display>
			<div class="mt-6">
				<Mono size="meta" tone="muted">It may have been deleted.</Mono>
			</div>
		</div>
	{:else}
		<div class="mt-8 flex items-baseline justify-between gap-3">
			<div class="min-w-0 flex-1">
				<Eyebrow>{tin.maker || 'Unknown maker'}</Eyebrow>
				<div class="mt-2">
					<Display size="xl">{tin.name}</Display>
				</div>
			</div>
			<a
				href="/tins/{tin.id}/edit"
				class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
			>
				edit
			</a>
		</div>

		<div class="mt-3 flex flex-wrap gap-x-2">
			<Mono size="meta" tone="muted">{GRADE_LABELS[tin.grade]}</Mono>
			<Mono size="meta" tone="muted">· {REGION_LABELS[tin.region]}</Mono>
			{#if tin.cultivar}<Mono size="meta" tone="muted">· {tin.cultivar}</Mono>{/if}
			{#if tin.harvestDate}
				<Mono size="meta" tone="muted">
					·
					{new Date(tin.harvestDate).toLocaleDateString(undefined, {
						month: 'short',
						year: 'numeric'
					})}
				</Mono>
			{/if}
			{#if tin.archived}
				<Mono size="meta" tone="faint">· archived</Mono>
			{/if}
		</div>

		<Hairline class="my-7" />

		<!-- Consumption rail -->
		<section>
			<Eyebrow>Consumption</Eyebrow>
			<div class="mt-3">
				<ConsumptionRail percent={pct} {ticks} />
			</div>
			<div class="mt-3 flex items-baseline justify-between">
				<div class="flex items-baseline gap-1.5">
					<Mono size="l" weight="light" tone="data">{remaining.toFixed(0)}</Mono>
					<Mono size="meta" tone="muted">g left</Mono>
				</div>
				<Mono size="meta" tone="muted">of {tin.weightGrams}g</Mono>
			</div>
			{#if fresh?.bowlsLeft != null}
				<div class="mt-1">
					<Mono size="meta" tone="muted">~{fresh.bowlsLeft} bowls left at your average use</Mono>
				</div>
			{/if}
		</section>

		<!-- Freshness window — only when opened -->
		{#if tin.openedAt && fresh?.days != null}
			<Hairline class="my-7" />
			<section>
				<Eyebrow>Freshness</Eyebrow>
				<div class="mt-2 flex items-baseline justify-between gap-3">
					<Mono size="m" tone="ink">
						Opened {fresh.days === 0 ? 'today' : `${fresh.days}d ago`}
					</Mono>
					{#if freshLabel}
						<Mono size="meta" tone={freshLabel.tone}>{freshLabel.label}</Mono>
					{/if}
				</div>
			</section>
		{/if}

		<!-- Sessions from this tin -->
		<Hairline class="my-7" />
		<section>
			<Eyebrow>From this tin · {sessions.length}</Eyebrow>
			{#if sessions.length === 0}
				<div class="mt-3">
					<Mono size="meta" tone="faint">No sessions yet. Brew one and it'll appear here.</Mono>
				</div>
			{:else}
				<ul class="border-hairline mt-2 border-t">
					{#each sessions as s (s.id)}
						<li>
							<a
								href="/sessions/{s.id}"
								class="hover:bg-surface border-hairline -mx-6 block border-b px-6 py-3 transition-colors"
							>
								<div class="flex items-baseline justify-between gap-3">
									<Mono size="meta" tone="muted"
										>{STYLE_LABELS[s.style]} · {formatTimeAgo(s.brewedAt)}</Mono
									>
									{#if s.rating}<Rating value={s.rating} size={6} />{/if}
								</div>
								<div class="mt-1">
									<Mono size="m" tone="ink">
										{s.powderGrams}g · {s.waterGrams}g · {s.waterTempC}°C
									</Mono>
								</div>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- Archive / unarchive -->
		<Hairline class="my-7" />
		{#if tin.archived}
			<PrimaryButton kind="line" onclick={unarchive} disabled={busy}>
				{busy ? 'Restoring…' : 'Unarchive'}
			</PrimaryButton>
		{:else}
			<PrimaryButton kind="line" onclick={archive} disabled={busy}>
				{busy ? 'Archiving…' : 'Archive'}
			</PrimaryButton>
		{/if}
	{/if}
</main>
