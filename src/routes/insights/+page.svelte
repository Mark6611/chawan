<script lang="ts">
	// Insights — a reflective look back over logged sessions + tins.
	// Composed from existing motifs (eyebrow + big-mono numerics + hairlines
	// + the FlavorChart palate map). NOT a dashboard: no goals, streaks,
	// badges, or scores. Every section guards its own data so a thin log
	// reads calm, not broken.

	import { repository } from '$lib/db/repository';
	import { syncState } from '$lib/sync.svelte';
	import {
		STYLE_LABELS,
		WHISK_LABELS,
		type Session,
		type Tin
	} from '$lib/db/types';
	import { MATCHA_CATALOG } from '$lib/catalog/matcha-catalog';
	import { formatPrice } from '$lib/sessions/currency';
	import {
		averageBrew,
		averageRating,
		bowlsInWindow,
		busiestDayOfWeek,
		cafeSpendByCurrency,
		lifetimeBowls,
		mostUsedTin,
		mostVisitedCafe,
		ownedCatalogIds,
		palateCentroid,
		palatePhrase,
		ratedCount,
		styleSplit,
		totalGramsConsumed,
		whiskPreference
	} from '$lib/insights/compute';

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import Chawan from '$lib/components/Chawan.svelte';
	import Rating from '$lib/components/Rating.svelte';
	import FlavorChart from '$lib/components/FlavorChart.svelte';

	let sessions = $state<Session[]>([]);
	let tins = $state<Tin[]>([]);
	let loaded = $state(false);

	async function load() {
		const [s, t] = await Promise.all([repository.listSessions(), repository.listTins()]);
		sessions = s;
		tins = t;
		loaded = true;
	}
	$effect(() => {
		void syncState.tick;
		load();
	});

	// ─── Derivations ─────────────────────────────────────────
	const total = $derived(lifetimeBowls(sessions));
	const grams = $derived(totalGramsConsumed(sessions));
	const week = $derived(bowlsInWindow(sessions, 7));
	const month = $derived(bowlsInWindow(sessions, 30));
	const busiest = $derived(busiestDayOfWeek(sessions));
	const split = $derived(styleSplit(sessions));
	const brew = $derived(averageBrew(sessions));
	const whisk = $derived(whiskPreference(sessions));
	const avgRating = $derived(averageRating(sessions));
	const rated = $derived(ratedCount(sessions));
	const topTin = $derived(mostUsedTin(sessions, tins));
	const spend = $derived(cafeSpendByCurrency(sessions));
	const topCafe = $derived(mostVisitedCafe(sessions));
	const owned = $derived(ownedCatalogIds(tins));
	const centroid = $derived(palateCentroid(tins));

	const spendEntries = $derived(Object.entries(spend));
	const styleRows = $derived(
		[
			{ key: 'usucha' as const, n: split.usucha },
			{ key: 'koicha' as const, n: split.koicha },
			{ key: 'latte' as const, n: split.latte }
		].filter((r) => r.n > 0)
	);
	const styleMax = $derived(Math.max(1, split.usucha, split.koicha, split.latte));
</script>

<main class="mx-auto max-w-md px-6 py-12 pb-28">
	<Eyebrow>Reflection</Eyebrow>
	<div class="mt-2">
		<Display size="l">Insights</Display>
	</div>

	{#if !loaded}
		<div class="mt-16 text-center">
			<Mono size="meta" tone="muted">Loading…</Mono>
		</div>
	{:else if total === 0}
		<!-- Calm empty state -->
		<Hairline class="my-7" />
		<div class="flex flex-col items-center text-center">
			<Chawan size={72} filled={false} />
			<div class="mt-6">
				<Display size="m">Nothing to look back on yet.</Display>
			</div>
			<p class="text-muted mt-4 max-w-[28ch] text-[14px] italic">
				Log a few sessions and your patterns will gather here — quietly, over time.
			</p>
		</div>
	{:else}
		<!-- Lifetime -->
		<Hairline class="my-7" />
		<section>
			<Eyebrow>All time</Eyebrow>
			<div class="mt-3 flex items-baseline justify-between">
				<div class="flex items-baseline gap-2">
					<Mono size="xl" weight="light" tone="data">{total}</Mono>
					<Mono size="meta" tone="muted">{total === 1 ? 'bowl' : 'bowls'}</Mono>
				</div>
				{#if grams > 0}
					<div class="flex items-baseline gap-1.5">
						<Mono size="l" weight="light" tone="ink">{grams.toFixed(0)}</Mono>
						<Mono size="meta" tone="muted">g whisked</Mono>
					</div>
				{/if}
			</div>
		</section>

		<!-- Rhythm -->
		<Hairline class="my-7" />
		<section>
			<Eyebrow>Rhythm</Eyebrow>
			<div class="mt-3 flex items-baseline gap-8">
				<div class="flex items-baseline gap-1.5">
					<Mono size="l" weight="light" tone="ink">{week}</Mono>
					<Mono size="meta" tone="muted">this week</Mono>
				</div>
				<div class="flex items-baseline gap-1.5">
					<Mono size="l" weight="light" tone="ink">{month}</Mono>
					<Mono size="meta" tone="muted">this month</Mono>
				</div>
			</div>
			{#if busiest}
				<div class="mt-3">
					<Mono size="meta" tone="muted">Most often a {busiest}.</Mono>
				</div>
			{/if}
		</section>

		<!-- Palate map (hero) -->
		{#if centroid}
			<Hairline class="my-7" />
			<section>
				<div class="flex items-baseline justify-between">
					<Eyebrow>Your palate</Eyebrow>
					<Mono size="meta" tone="muted">{centroid.mappedCount} mapped</Mono>
				</div>
				<div class="mt-2">
					<Display size="m" italic as="h2">Mostly {palatePhrase(centroid)}.</Display>
				</div>
				<div class="mt-4 flex justify-center">
					<FlavorChart products={MATCHA_CATALOG} size="hero" ownedIds={owned} brandFilter={undefined} />
				</div>
				{#if owned.length > centroid.mappedCount}
					<div class="mt-2">
						<Mono size="meta" tone="faint">
							{owned.length - centroid.mappedCount} owned without a published taste profile
						</Mono>
					</div>
				{/if}
			</section>
		{:else if owned.length === 0}
			<Hairline class="my-7" />
			<section>
				<Eyebrow>Your palate</Eyebrow>
				<p class="text-muted mt-2 text-[14px] italic">
					Add a tin from the catalog and your taste will start to map here.
				</p>
			</section>
		{/if}

		<!-- Style split -->
		{#if styleRows.length > 0}
			<Hairline class="my-7" />
			<section>
				<Eyebrow>Style</Eyebrow>
				<div class="mt-3 space-y-2.5">
					{#each styleRows as row (row.key)}
						<div>
							<div class="flex items-baseline justify-between">
								<Mono size="meta" tone="muted">{STYLE_LABELS[row.key]}</Mono>
								<Mono size="meta" tone="ink">{row.n}</Mono>
							</div>
							<div class="bg-hairline mt-1 h-[2px] w-full">
								<div
									class="bg-data h-[2px] transition-[width] duration-300"
									style="width: {(row.n / styleMax) * 100}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Brew habits -->
		{#if brew}
			<Hairline class="my-7" />
			<section>
				<Eyebrow>Your usual brew</Eyebrow>
				<div class="mt-3 grid grid-cols-3 gap-4">
					<div>
						<Mono size="meta" tone="muted">powder</Mono>
						<div class="mt-1 flex items-baseline gap-1">
							<Mono size="l" weight="light" tone="ink">{brew.powderGrams.toFixed(1)}</Mono>
							<Mono size="meta" tone="muted">g</Mono>
						</div>
					</div>
					<div>
						<Mono size="meta" tone="muted">water</Mono>
						<div class="mt-1 flex items-baseline gap-1">
							<Mono size="l" weight="light" tone="ink">{brew.waterGrams.toFixed(0)}</Mono>
							<Mono size="meta" tone="muted">g</Mono>
						</div>
					</div>
					<div>
						<Mono size="meta" tone="muted">temp</Mono>
						<div class="mt-1 flex items-baseline gap-1">
							<Mono size="l" weight="light" tone="ink">{brew.waterTempC.toFixed(0)}</Mono>
							<Mono size="meta" tone="muted">°C</Mono>
						</div>
					</div>
				</div>
				{#if whisk}
					<div class="mt-3">
						<Mono size="meta" tone="muted">Usually a {WHISK_LABELS[whisk as keyof typeof WHISK_LABELS]}.</Mono>
					</div>
				{/if}
			</section>
		{/if}

		<!-- Top tin -->
		{#if topTin}
			<Hairline class="my-7" />
			<section>
				<Eyebrow>Most-reached-for tin</Eyebrow>
				<div class="mt-2 flex items-baseline justify-between gap-3">
					<a href="/tins/{topTin.tin.id}" class="min-w-0 flex-1">
						<Display size="s" italic={false} as="h3">{topTin.tin.name}</Display>
						<div class="mt-0.5">
							<Mono size="meta" tone="muted">{topTin.tin.maker}</Mono>
						</div>
					</a>
					<div class="flex items-baseline gap-1.5">
						<Mono size="l" weight="light" tone="data">{topTin.count}</Mono>
						<Mono size="meta" tone="muted">{topTin.count === 1 ? 'bowl' : 'bowls'}</Mono>
					</div>
				</div>
			</section>
		{/if}

		<!-- Rating -->
		{#if avgRating != null}
			<Hairline class="my-7" />
			<section>
				<Eyebrow>How you've rated</Eyebrow>
				<div class="mt-3 flex items-center gap-3">
					<Rating value={Math.round(avgRating * 2) / 2} size={12} />
					<Mono size="meta" tone="muted">{avgRating.toFixed(1)} avg · {rated} rated</Mono>
				</div>
			</section>
		{/if}

		<!-- Cafe spend -->
		{#if spendEntries.length > 0}
			<Hairline class="my-7" />
			<section>
				<Eyebrow>At cafes</Eyebrow>
				<div class="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
					{#each spendEntries as [cur, cents] (cur)}
						<div class="flex items-baseline gap-1.5">
							<Mono size="l" weight="light" tone="ink">{formatPrice(cents, cur)}</Mono>
							<Mono size="meta" tone="muted">{cur}</Mono>
						</div>
					{/each}
				</div>
				{#if topCafe}
					<div class="mt-3">
						<Mono size="meta" tone="muted">
							Most visits to {topCafe.name} · {topCafe.count}
						</Mono>
					</div>
				{/if}
			</section>
		{/if}
	{/if}
</main>
