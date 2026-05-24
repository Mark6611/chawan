<script lang="ts">
	// Catalog browse — LIST and CHART views toggled by URL state
	// (`?view=list` default, `?view=chart`). Filters live in URL too:
	// `?brand=...`, `?grade=...`, `?region=...`, `?owned=1`. Survives
	// refresh, shareable, plays nice with back/forward.
	//
	// "I've tried" indicator reads Tin.catalogId from the repository.

	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	import { MATCHA_CATALOG } from '$lib/catalog/matcha-catalog';
	import { listBrands } from '$lib/catalog/brands';
	import { searchCatalog } from '$lib/catalog/search';
	import { hasTaste, type BrandId } from '$lib/catalog/types';
	import {
		GRADE_LABELS,
		REGION_LABELS,
		type Grade,
		type Region,
		type Tin
	} from '$lib/db/types';
	import { repository } from '$lib/db/repository';
	import { syncState } from '$lib/sync.svelte';

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import CatalogRow from '$lib/components/CatalogRow.svelte';
	import FlavorChart from '$lib/components/FlavorChart.svelte';
	import ChartLegend from '$lib/components/ChartLegend.svelte';
	import NotPlottedRail from '$lib/components/NotPlottedRail.svelte';

	type View = 'list' | 'chart';

	// ─── URL-driven state ────────────────────────────────────
	const view = $derived<View>(
		(page.url.searchParams.get('view') as View | null) ?? 'list'
	);
	const brandFilter = $derived<BrandId | undefined>(
		(page.url.searchParams.get('brand') as BrandId | null) ?? undefined
	);
	const gradeFilter = $derived<Grade | undefined>(
		(page.url.searchParams.get('grade') as Grade | null) ?? undefined
	);
	const regionFilter = $derived<Region | undefined>(
		(page.url.searchParams.get('region') as Region | null) ?? undefined
	);
	const ownedOnly = $derived(page.url.searchParams.get('owned') === '1');
	const query = $derived(page.url.searchParams.get('q') ?? '');

	function setParam(key: string, value: string | null) {
		const url = new URL(page.url);
		if (value === null || value === '') url.searchParams.delete(key);
		else url.searchParams.set(key, value);
		goto(url.pathname + url.search, { replaceState: true, keepFocus: true, noScroll: true });
	}

	function setView(v: View) {
		setParam('view', v === 'list' ? null : 'chart');
	}

	function toggleBrand(id: BrandId) {
		setParam('brand', brandFilter === id ? null : id);
	}
	function toggleGrade(g: Grade) {
		setParam('grade', gradeFilter === g ? null : g);
	}
	function toggleOwned() {
		setParam('owned', ownedOnly ? null : '1');
	}

	// ─── "I've tried" — pull owned catalog ids from repository ─
	let tins = $state<Tin[]>([]);

	async function loadTins() {
		tins = await repository.listTins();
	}
	$effect(() => {
		void syncState.tick;
		loadTins();
	});

	const ownedIds = $derived(
		tins.map((t) => t.catalogId).filter((id): id is string => !!id)
	);
	const ownedSet = $derived(new Set(ownedIds));

	// ─── Filtered set ────────────────────────────────────────
	const filtered = $derived.by(() => {
		let entries = [...MATCHA_CATALOG];
		if (brandFilter) entries = entries.filter((e) => e.brand === brandFilter);
		if (gradeFilter) entries = entries.filter((e) => e.grade === gradeFilter);
		if (regionFilter) entries = entries.filter((e) => e.region === regionFilter);
		if (ownedOnly) entries = entries.filter((e) => ownedSet.has(e.id));
		if (query) entries = searchCatalog(query, entries);
		return entries;
	});

	// Grouped by brand → grade for the LIST view's section headers.
	const groupedForList = $derived.by(() => {
		const groups = new Map<BrandId, typeof MATCHA_CATALOG[number][]>();
		for (const e of filtered) {
			if (!groups.has(e.brand)) groups.set(e.brand, []);
			groups.get(e.brand)!.push(e);
		}
		return Array.from(groups.entries());
	});

	const plotted = $derived(filtered.filter(hasTaste));
	const unplotted = $derived(filtered.filter((e) => !hasTaste(e)));

	const counts = $derived.by(() => {
		const c: Partial<Record<BrandId, number>> = {};
		for (const e of MATCHA_CATALOG) c[e.brand] = (c[e.brand] ?? 0) + 1;
		return c;
	});

	const brands = listBrands();
	const grades: Grade[] = ['ceremonial', 'premium', 'culinary'];

	onMount(loadTins);
</script>

<main class="mx-auto max-w-md px-6 py-12 pb-28">
	<Eyebrow>Reference</Eyebrow>
	<div class="mt-2">
		<Display size="l">Catalog</Display>
	</div>
	<p class="text-muted mt-3 max-w-[36ch] text-[14px] italic">
		Known matcha SKUs from leading Japanese makers — the lineup before you pick a tin.
	</p>

	<!-- ─── View toggle ──────────────────────────────────── -->
	<div class="mt-6 flex gap-5">
		<button
			type="button"
			onclick={() => setView('list')}
			class="font-mono text-[11px] tracking-[0.10em] uppercase {view === 'list'
				? 'text-tea'
				: 'text-muted hover:text-ink'}"
		>
			List
		</button>
		<button
			type="button"
			onclick={() => setView('chart')}
			class="font-mono text-[11px] tracking-[0.10em] uppercase {view === 'chart'
				? 'text-tea'
				: 'text-muted hover:text-ink'}"
		>
			Chart
		</button>
	</div>

	<!-- ─── Filter rail (horizontally scrollable on mobile) ─ -->
	<div class="-mx-6 mt-4 overflow-x-auto px-6">
		<div class="flex gap-2 whitespace-nowrap pb-1">
			{#each brands as b (b.id)}
				{@const sel = brandFilter === b.id}
				<button
					type="button"
					onclick={() => toggleBrand(b.id)}
					class="rounded-full border-[0.5px] px-2.5 py-1 font-mono text-[11px] transition-colors {sel
						? 'border-tea bg-tea-wash text-tea'
						: 'border-rule text-muted hover:text-ink'}"
				>
					{b.shortName} · {counts[b.id] ?? 0}
				</button>
			{/each}
			{#each grades as g (g)}
				{@const sel = gradeFilter === g}
				<button
					type="button"
					onclick={() => toggleGrade(g)}
					class="rounded-full border-[0.5px] px-2.5 py-1 font-mono text-[11px] transition-colors {sel
						? 'border-tea bg-tea-wash text-tea'
						: 'border-rule text-muted hover:text-ink'}"
				>
					{GRADE_LABELS[g]}
				</button>
			{/each}
			<button
				type="button"
				onclick={toggleOwned}
				class="rounded-full border-[0.5px] px-2.5 py-1 font-mono text-[11px] transition-colors {ownedOnly
					? 'border-tea bg-tea-wash text-tea'
					: 'border-rule text-muted hover:text-ink'}"
			>
				I've tried · {ownedSet.size}
			</button>
		</div>
	</div>

	<Hairline class="my-6" />

	{#if filtered.length === 0}
		<div class="mt-12 text-center">
			<Mono size="meta" tone="muted">No catalog entries match these filters.</Mono>
		</div>
	{:else if view === 'list'}
		<!-- LIST view — grouped by brand -->
		{#each groupedForList as [brandId, entries] (brandId)}
			{@const brand = brands.find((b) => b.id === brandId)!}
			<section class="mb-7">
				<Eyebrow>{brand.name} · {entries.length}</Eyebrow>
				<div class="border-hairline mt-2 border-t">
					{#each entries as e (e.id)}
						<CatalogRow entry={e} tried={ownedSet.has(e.id)} />
					{/each}
				</div>
			</section>
		{/each}
	{:else}
		<!-- CHART view -->
		<div class="flex justify-center">
			<FlavorChart
				products={filtered}
				size="hero"
				{brandFilter}
				ownedIds={Array.from(ownedSet)}
				onSelect={(p) => goto(`/catalog/${p.id}`)}
			/>
		</div>
		<div class="mt-5 flex justify-center">
			<ChartLegend
				active={brandFilter}
				{counts}
				onSelect={(b) => setParam('brand', b ?? null)}
			/>
		</div>
		<NotPlottedRail products={unplotted} />
		{#if plotted.length === 0 && unplotted.length === 0}
			<div class="mt-6 text-center">
				<Mono size="meta" tone="muted">No products to chart with these filters.</Mono>
			</div>
		{/if}
	{/if}
</main>
