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

	import { MATCHA_CATALOG, CATALOG_BY_ID } from '$lib/catalog/matcha-catalog';
	import { BRANDS, listBrands } from '$lib/catalog/brands';
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
	import BrandGlyph from '$lib/components/BrandGlyph.svelte';
	import Chawan from '$lib/components/Chawan.svelte';

	type View = 'list' | 'chart';

	// ─── URL-driven state ────────────────────────────────────
	// `?return=...` flips the page into picker mode (rows fire onpick →
	// route to /tins/new?catalogId=...&returnTo=<return> instead of
	// going to detail). A "Cancel" link returns to <return> without
	// picking. URL-driven so back-gesture works and the picker page
	// is shareable.
	const returnUrl = $derived(page.url.searchParams.get('return'));
	const pickerMode = $derived(!!returnUrl);

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

	function handlePick(entryId: string) {
		// Picker mode → forward to TinForm with the catalog prefill +
		// returnTo so the form sends the user back where they started.
		if (!returnUrl) return;
		const params = new URLSearchParams();
		params.set('catalogId', entryId);
		params.set('returnTo', returnUrl);
		void goto(`/tins/new?${params.toString()}`);
	}

	// Chart-view in-place selection. Tapping a dot in browse mode previews
	// the product below the chart instead of navigating; tap again (or tap
	// another dot) to swap focus; tap × to clear. Lets you compare multiple
	// products without leaving the chart.
	let selectedId = $state<string | undefined>(undefined);

	// If the active filter set hides the selected product, clear the
	// selection so the inline card doesn't reference an off-chart entry.
	$effect(() => {
		if (selectedId && !filtered.find((e) => e.id === selectedId)) {
			selectedId = undefined;
		}
	});

	const selectedEntry = $derived(selectedId ? CATALOG_BY_ID[selectedId] : undefined);

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
	{#if pickerMode}
		<a
			href={returnUrl}
			class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
		>
			← cancel
		</a>
		<div class="mt-8">
			<Eyebrow>Browse catalog</Eyebrow>
			<div class="mt-2">
				<Display size="l">Pick a matcha</Display>
			</div>
			<p class="text-muted mt-3 max-w-[36ch] text-[14px] italic">
				Tap to prefill the tin form — you'll fill in weight + opened date next.
			</p>
		</div>
	{:else}
		<Eyebrow>Reference</Eyebrow>
		<div class="mt-2">
			<Display size="l">Catalog</Display>
		</div>
		<p class="text-muted mt-3 max-w-[36ch] text-[14px] italic">
			Known matcha SKUs from leading Japanese makers — the lineup before you pick a tin.
		</p>
	{/if}

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
						<CatalogRow
							entry={e}
							tried={ownedSet.has(e.id)}
							picker={pickerMode}
							onpick={pickerMode ? (en) => handlePick(en.id) : undefined}
						/>
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
				highlightId={pickerMode ? undefined : selectedId}
				labelFor={pickerMode ? undefined : selectedId}
				{brandFilter}
				ownedIds={Array.from(ownedSet)}
				onSelect={(p) => {
					if (pickerMode) handlePick(p.id);
					else selectedId = selectedId === p.id ? undefined : p.id;
				}}
			/>
		</div>

		<!-- In-place selection card (browse mode only) -->
		{#if !pickerMode && selectedEntry}
			{@const sel = selectedEntry}
			{@const brand = BRANDS[sel.brand]}
			<div
				class="border-hairline relative mt-5 rounded-[14px] border-[0.5px] px-4 py-4"
			>
				<button
					type="button"
					onclick={() => (selectedId = undefined)}
					class="text-muted hover:text-ink absolute top-2 right-3 grid h-6 w-6 place-items-center font-mono text-[16px] leading-none"
					aria-label="Clear selection"
				>
					×
				</button>

				<div class="flex items-baseline gap-3">
					<BrandGlyph brand={sel.brand} size={14} />
					<div class="min-w-0 flex-1">
						<div class="flex items-baseline gap-2">
							<span class="text-ink truncate font-display text-[20px] italic">{sel.name}</span>
							{#if sel.kanji}
								<span class="text-muted shrink-0 font-display text-[14px]">{sel.kanji}</span>
							{/if}
							{#if ownedSet.has(sel.id)}
								<span class="ml-1 shrink-0"><Chawan size={12} filled /></span>
							{/if}
						</div>
						<div class="text-muted mt-0.5 font-mono text-[11px]">
							{brand.shortName} · {GRADE_LABELS[sel.grade]} · {REGION_LABELS[sel.region]}
							{#if sel.cultivars && sel.cultivars.length > 0}
								· {sel.cultivars.join(' · ')}
							{/if}
						</div>
					</div>
				</div>

				{#if sel.tasteNotes && sel.tasteNotes.length > 0}
					<div class="mt-3 flex flex-wrap gap-1.5">
						{#each sel.tasteNotes as note (note)}
							<span
								class="border-hairline text-muted rounded-full border-[0.5px] px-2 py-0.5 font-mono text-[10px] tracking-[0.05em]"
							>
								{note}
							</span>
						{/each}
					</div>
				{/if}

				{#if sel.description}
					<p class="text-muted mt-3 font-body text-[14px] italic leading-relaxed">
						{sel.description}
					</p>
				{/if}

				<div class="mt-3 flex items-center justify-end">
					<a
						href="/catalog/{sel.id}"
						class="text-tea hover:text-ink font-mono text-[11px] font-medium tracking-[0.10em] uppercase"
					>
						Open detail →
					</a>
				</div>
			</div>
		{/if}

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
