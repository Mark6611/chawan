<script lang="ts">
	// Dev exhibit for FlavorChart at all three sizes + ChartLegend +
	// NotPlottedRail. Visual smoke test: the Marukyu 10-product set
	// should read as a clean diagonal stripe sharp→mild × refreshing→
	// full-body. Brand glyphs distinguish without color.

	import { MATCHA_CATALOG } from '$lib/catalog/matcha-catalog';
	import { hasTaste, type BrandId } from '$lib/catalog/types';

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import FlavorChart from '$lib/components/FlavorChart.svelte';
	import NotPlottedRail from '$lib/components/NotPlottedRail.svelte';
	import ChartLegend from '$lib/components/ChartLegend.svelte';

	const products = MATCHA_CATALOG;
	const unplotted = products.filter((p) => !hasTaste(p));

	const counts: Partial<Record<BrandId, number>> = {};
	for (const p of products) {
		counts[p.brand] = (counts[p.brand] ?? 0) + 1;
	}

	// Interactive state for the hero exhibit
	let highlightId = $state<string | undefined>('mk-eiju');
	let labelFor = $state<string | undefined>('mk-eiju');
	let brandFilter = $state<BrandId | undefined>(undefined);
</script>

<main class="mx-auto max-w-2xl px-6 py-12 pb-28">
	<Eyebrow>DEV · flavor chart</Eyebrow>
	<div class="mt-2">
		<Display size="l">Chart exhibit</Display>
	</div>
	<p class="text-muted mt-3 text-[14px] italic">
		The Marukyu 10-product set should read as a clean diagonal stripe sharp→mild ×
		refreshing→full-body. Brand glyphs (disc / ring / diamond) distinguish without color.
	</p>

	<Hairline class="my-7" />

	<!-- ─── Hero (interactive) ──────────────────────────────── -->
	<section>
		<Eyebrow>Hero · 320×320 · interactive</Eyebrow>
		<div class="mt-4">
			<FlavorChart
				{products}
				size="hero"
				{highlightId}
				{labelFor}
				{brandFilter}
				onSelect={(p) => {
					highlightId = p.id;
					labelFor = p.id;
				}}
			/>
		</div>
		<div class="mt-4">
			<ChartLegend
				active={brandFilter}
				{counts}
				onSelect={(b) => {
					brandFilter = b;
				}}
			/>
		</div>
		<NotPlottedRail products={unplotted} />
		<div class="mt-3">
			<Mono size="meta" tone="faint">
				Tap a dot to flip the label · tap a brand in the legend to filter
			</Mono>
		</div>
	</section>

	<Hairline class="my-7" />

	<!-- ─── Inline (typically on a detail page) ────────────── -->
	<section>
		<Eyebrow>Inline · 248×248 · static (labelFor=mk-eiju)</Eyebrow>
		<div class="mt-4">
			<FlavorChart {products} size="inline" highlightId="mk-eiju" labelFor="mk-eiju" />
		</div>
	</section>

	<Hairline class="my-7" />

	<!-- ─── Thumb (future use) ─────────────────────────────── -->
	<section>
		<Eyebrow>Thumb · 72×72 · two variants</Eyebrow>
		<div class="mt-4 flex items-center gap-6">
			<div>
				<FlavorChart {products} size="thumb" />
				<div class="mt-2">
					<Mono size="meta" tone="muted">plain</Mono>
				</div>
			</div>
			<div>
				<FlavorChart {products} size="thumb" highlightId="mk-eiju" />
				<div class="mt-2">
					<Mono size="meta" tone="muted">highlighted</Mono>
				</div>
			</div>
		</div>
	</section>

	<Hairline class="my-7" />

	<!-- ─── Edge labels (smoke test the flip logic) ────────── -->
	<section>
		<Eyebrow>Edge-label flip · static labelFor candidates</Eyebrow>
		<div class="mt-4 grid grid-cols-2 gap-4">
			<div>
				<FlavorChart {products} size="inline" highlightId="mk-aoarashi" labelFor="mk-aoarashi" />
				<div class="mt-2">
					<Mono size="meta" tone="muted">lower-left dot (Aoarashi)</Mono>
				</div>
			</div>
			<div>
				<FlavorChart {products} size="inline" highlightId="mk-tenju" labelFor="mk-tenju" />
				<div class="mt-2">
					<Mono size="meta" tone="muted">upper-right dot (Tenju)</Mono>
				</div>
			</div>
		</div>
	</section>
</main>
