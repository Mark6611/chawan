<script lang="ts">
	// Catalog detail. Italic name + brand eyebrow + grade/region/cultivar
	// meta + optional description + inline FlavorChart showing this
	// product's position within its maker's lineup (brand-filtered so
	// other brands dim) + "Add to inventory" CTA + Source link.

	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import { getCatalogEntry, MATCHA_CATALOG } from '$lib/catalog/matcha-catalog';
	import { BRANDS } from '$lib/catalog/brands';
	import { hasTaste } from '$lib/catalog/types';
	import { GRADE_LABELS, REGION_LABELS, type Tin } from '$lib/db/types';
	import { repository } from '$lib/db/repository';
	import { syncState } from '$lib/sync.svelte';

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import Chawan from '$lib/components/Chawan.svelte';
	import FlavorChart from '$lib/components/FlavorChart.svelte';
	import PrimaryButton from '$lib/components/PrimaryButton.svelte';

	const id = $derived(page.params.id);
	const entry = $derived(id ? getCatalogEntry(id) : undefined);
	const brand = $derived(entry ? BRANDS[entry.brand] : undefined);

	// "You have N tins of this" — query the repo.
	let tins = $state<Tin[]>([]);
	async function loadTins() {
		tins = await repository.listTins();
	}
	$effect(() => {
		void syncState.tick;
		loadTins();
	});
	const ownedCount = $derived(
		entry ? tins.filter((t) => t.catalogId === entry.id).length : 0
	);

	const labelFor = $derived(entry?.id);
	const highlightId = $derived(entry?.id);

	const styleSuitability = $derived.by(() => {
		if (!entry) return '';
		const parts: string[] = [];
		if (entry.usuchaSuitable) parts.push('usucha');
		if (entry.koichaSuitable) parts.push('koicha');
		return parts.join(' · ');
	});

	function formatJPY(yenPerGram: number): string {
		return `¥${yenPerGram}/g`;
	}

	onMount(loadTins);
</script>

<main class="mx-auto max-w-md px-6 py-12 pb-28">
	<a
		href="/catalog"
		class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
	>
		← back
	</a>

	{#if !entry || !brand}
		<div class="mt-16 text-center">
			<Display size="m">Not found.</Display>
			<div class="mt-4">
				<Mono size="meta" tone="muted">No catalog entry with id "{id}".</Mono>
			</div>
		</div>
	{:else}
		<!-- Hero -->
		<div class="mt-8">
			<Eyebrow>{brand.name}</Eyebrow>
			<div class="mt-2 flex items-baseline gap-3">
				<Display size="xl">{entry.name}</Display>
				{#if entry.kanji}
					<span class="text-muted font-display text-[22px]">{entry.kanji}</span>
				{/if}
			</div>
		</div>

		<!-- Meta line -->
		<div class="mt-3 flex flex-wrap gap-x-2">
			<Mono size="meta" tone="muted">{GRADE_LABELS[entry.grade]}</Mono>
			<Mono size="meta" tone="muted">· {REGION_LABELS[entry.region]}</Mono>
			{#if entry.cultivars && entry.cultivars.length > 0}
				<Mono size="meta" tone="muted">· {entry.cultivars.join(' · ')}</Mono>
			{/if}
			{#if styleSuitability}
				<Mono size="meta" tone="muted">· {styleSuitability}</Mono>
			{/if}
			{#if entry.jpyPerGram}
				<Mono size="meta" tone="muted">· {formatJPY(entry.jpyPerGram)}</Mono>
			{/if}
		</div>

		<!-- "You have N tins" indicator -->
		{#if ownedCount > 0}
			<div class="mt-4 flex items-center gap-2">
				<Chawan size={16} filled />
				<Mono size="meta" tone="data">
					You've tried this · {ownedCount} {ownedCount === 1 ? 'tin' : 'tins'} in inventory
				</Mono>
			</div>
		{/if}

		<!-- Taste notes -->
		{#if entry.tasteNotes && entry.tasteNotes.length > 0}
			<div class="mt-4 flex flex-wrap gap-1.5">
				{#each entry.tasteNotes as note (note)}
					<span
						class="border-hairline text-muted rounded-full border-[0.5px] px-2.5 py-0.5 font-mono text-[10.5px] tracking-[0.05em]"
					>
						{note}
					</span>
				{/each}
			</div>
		{/if}

		<!-- Description -->
		{#if entry.description}
			<p class="text-ink mt-5 font-body text-[15px] italic leading-relaxed">
				{entry.description}
			</p>
		{/if}

		<Hairline class="my-7" />

		<!-- Inline mini-chart: this brand's lineup, this product highlighted -->
		{#if hasTaste(entry)}
			<section>
				<Eyebrow>Within {brand.shortName}'s lineup</Eyebrow>
				<div class="mt-4 flex justify-center">
					<FlavorChart
						products={MATCHA_CATALOG}
						size="inline"
						{highlightId}
						{labelFor}
						brandFilter={entry.brand}
					/>
				</div>
			</section>
		{:else}
			<section>
				<Eyebrow>Taste profile</Eyebrow>
				<p class="text-muted mt-2 text-[14px] italic">
					{brand.shortName} doesn't publish a flavor chart for this product. It surfaces in the
					Not Plotted rail on the catalog browse.
				</p>
			</section>
		{/if}

		<Hairline class="my-7" />

		<!-- Add to inventory CTA — Session 17 wires TinForm to read ?catalogId -->
		<PrimaryButton href="/tins/new?catalogId={entry.id}">Add to inventory</PrimaryButton>

		{#if entry.productUrl}
			<div class="mt-4 text-center">
				<a
					href={entry.productUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
				>
					Source · maker's product page ↗
				</a>
			</div>
		{/if}
	{/if}
</main>
