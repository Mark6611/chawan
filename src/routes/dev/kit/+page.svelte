<script lang="ts">
	// Atoms exhibit. Eyeball every primitive in day + night themes before
	// composing real screens. Delete this route in Session 8 or 9.

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Chawan from '$lib/components/Chawan.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import Rating from '$lib/components/Rating.svelte';
	import Field from '$lib/components/Field.svelte';
	import Segmented from '$lib/components/Segmented.svelte';
	import Stepper from '$lib/components/Stepper.svelte';
	import ChipGroup from '$lib/components/ChipGroup.svelte';
	import PrimaryButton from '$lib/components/PrimaryButton.svelte';
	import ConsumptionRail from '$lib/components/ConsumptionRail.svelte';
	import LinkRail from '$lib/components/LinkRail.svelte';

	import { REGION_LABELS, STYLE_LABELS, MILK_LABELS, WHISK_LABELS } from '$lib/db/types';

	let style = $state<string>('usucha');
	let milk = $state<string>('oat');
	let region = $state<string>('uji');
	let whisks = $state<string[]>(['chasen-100']);
	let powder = $state(2);
	let water = $state(60);
	let temp = $state(76);
	let rating = $state(4);

	const styleOpts = Object.entries(STYLE_LABELS).map(([value, label]) => ({ value, label }));
	const milkOpts = Object.entries(MILK_LABELS).map(([value, label]) => ({ value, label }));
	const regionOpts = Object.entries(REGION_LABELS).map(([value, label]) => ({ value, label }));
	const whiskOpts = Object.entries(WHISK_LABELS).map(([value, label]) => ({ value, label }));

	// A fake distribution of session-ticks for the consumption rail demo.
	const fakeTicks = [0.04, 0.12, 0.18, 0.31, 0.36, 0.5, 0.61];
</script>

<main class="mx-auto max-w-md px-6 py-12 pb-24">
	<Eyebrow>Dev · component kit</Eyebrow>
	<Display size="l">Atoms</Display>
	<p class="text-muted mt-2 text-[13px] italic">
		Every primitive used by the real screens. Flip the theme toggle (top-right) to see day + night.
	</p>

	<Hairline class="my-7" />

	<!-- Eyebrow -->
	<section class="space-y-3">
		<Eyebrow>Eyebrow</Eyebrow>
		<div class="space-y-2">
			<Eyebrow>Mon 19 May · 07:55 · Personal</Eyebrow>
			<Eyebrow accent>Accent variant — color-data</Eyebrow>
		</div>
	</section>

	<Hairline class="my-7" />

	<!-- Display -->
	<section class="space-y-4">
		<Eyebrow>Display</Eyebrow>
		<Display size="xl">Hero · 42px italic</Display>
		<Display size="l">Today · 34px italic</Display>
		<Display size="m" as="h2">Card title · 26px italic</Display>
		<Display size="s" italic={false} as="h3">Row title · 20px upright</Display>
	</section>

	<Hairline class="my-7" />

	<!-- Mono -->
	<section class="space-y-3">
		<Eyebrow>Mono numerics</Eyebrow>
		<div>
			<Mono size="xl" weight="light" tone="data">42</Mono>
			<Mono size="meta" tone="muted">XL · light · data</Mono>
		</div>
		<div>
			<Mono size="l" weight="normal" tone="ink">2.0</Mono>
			<Mono size="meta" tone="muted">L · ink · g</Mono>
		</div>
		<div>
			<Mono size="m" tone="ink">76°C</Mono>
			<Mono size="meta" tone="muted">M</Mono>
		</div>
		<div>
			<Mono size="meta" tone="muted">Marukyu Kōyamaen · Uji</Mono>
		</div>
	</section>

	<Hairline class="my-7" />

	<!-- Chawan glyph -->
	<section class="space-y-3">
		<Eyebrow>Chawan glyph</Eyebrow>
		<div class="flex items-end gap-6">
			<Chawan size={18} />
			<Chawan size={22} />
			<Chawan size={28} />
			<Chawan size={48} />
			<Chawan size={72} />
		</div>
		<div class="flex items-end gap-6">
			<Chawan size={48} filled={false} />
			<Mono size="meta" tone="muted">ring only (filled=false)</Mono>
		</div>
	</section>

	<Hairline class="my-7" />

	<!-- Hairline -->
	<section class="space-y-3">
		<Eyebrow>Hairlines</Eyebrow>
		<div>
			<Mono size="meta" tone="muted">hairline (~9% ink)</Mono>
			<Hairline class="mt-2" />
		</div>
		<div>
			<Mono size="meta" tone="muted">rule (~18% ink)</Mono>
			<Hairline rule class="mt-2" />
		</div>
	</section>

	<Hairline class="my-7" />

	<!-- Rating -->
	<section class="space-y-3">
		<Eyebrow>Rating</Eyebrow>
		<div class="flex items-center gap-6">
			<Rating value={0} />
			<Rating value={2} />
			<Rating value={4} />
			<Rating value={5} />
		</div>
		<div class="flex items-center gap-3">
			<Mono size="meta" tone="muted">interactive (bind):</Mono>
			<Rating bind:value={rating} interactive />
			<Mono size="meta" tone="muted">value: {rating}</Mono>
		</div>
	</section>

	<Hairline class="my-7" />

	<!-- Field -->
	<section class="space-y-3">
		<Eyebrow>Field</Eyebrow>
		<div>
			<Field label="Tin">
				{#snippet action()}
					<Mono size="meta" tone="muted">change ›</Mono>
				{/snippet}
				<Mono size="m" tone="ink">Eiju · Marukyu Kōyamaen</Mono>
			</Field>
			<Field label="Notes" hairline={false}>
				<p class="text-ink text-[14px] italic">Vegetal, no astringency.</p>
			</Field>
		</div>
	</section>

	<Hairline class="my-7" />

	<!-- Segmented -->
	<section class="space-y-3">
		<Eyebrow>Segmented</Eyebrow>
		<div>
			<Mono size="meta" tone="muted">style — {style}</Mono>
			<div class="mt-2"><Segmented options={styleOpts} bind:value={style} /></div>
		</div>
	</section>

	<Hairline class="my-7" />

	<!-- Stepper -->
	<section class="space-y-3">
		<Eyebrow>Stepper</Eyebrow>
		<Field label="Powder">
			<Stepper bind:value={powder} min={0.5} max={6} step={0.1} digits={1} unit="g" />
		</Field>
		<Field label="Water">
			<Stepper bind:value={water} min={10} max={300} step={5} unit="g" />
		</Field>
		<Field label="Temp" hairline={false}>
			<Stepper bind:value={temp} min={50} max={100} unit="°C" />
		</Field>
	</section>

	<Hairline class="my-7" />

	<!-- ChipGroup -->
	<section class="space-y-4">
		<Eyebrow>ChipGroup</Eyebrow>
		<div>
			<Mono size="meta" tone="muted">region (single-select) — {region}</Mono>
			<div class="mt-2"><ChipGroup options={regionOpts} bind:value={region} /></div>
		</div>
		<div>
			<Mono size="meta" tone="muted">milk (single-select) — {milk}</Mono>
			<div class="mt-2"><ChipGroup options={milkOpts} bind:value={milk} /></div>
		</div>
		<div>
			<Mono size="meta" tone="muted">whisks (multi-select) — {whisks.join(', ') || '—'}</Mono>
			<div class="mt-2"><ChipGroup options={whiskOpts} bind:value={whisks} multi /></div>
		</div>
	</section>

	<Hairline class="my-7" />

	<!-- ConsumptionRail -->
	<section class="space-y-4">
		<Eyebrow>ConsumptionRail</Eyebrow>
		<div>
			<Mono size="meta" tone="muted">percent only</Mono>
			<div class="mt-2"><ConsumptionRail percent={0.35} /></div>
		</div>
		<div>
			<Mono size="meta" tone="muted">with per-session ticks</Mono>
			<div class="mt-2"><ConsumptionRail percent={0.61} ticks={fakeTicks} /></div>
		</div>
		<div>
			<Mono size="meta" tone="muted">empty</Mono>
			<div class="mt-2"><ConsumptionRail percent={0} /></div>
		</div>
		<div>
			<Mono size="meta" tone="muted">full</Mono>
			<div class="mt-2"><ConsumptionRail percent={1} /></div>
		</div>
	</section>

	<Hairline class="my-7" />

	<!-- PrimaryButton -->
	<section class="space-y-3">
		<Eyebrow>PrimaryButton</Eyebrow>
		<PrimaryButton>Begin a session</PrimaryButton>
		<PrimaryButton kind="line">Save changes</PrimaryButton>
		<PrimaryButton kind="ghost">Cancel</PrimaryButton>
		<PrimaryButton disabled>Disabled</PrimaryButton>
	</section>

	<Hairline class="my-7" />

	<!-- LinkRail (mounted as fixed at the bottom of the viewport) -->
	<section class="space-y-3">
		<Eyebrow>LinkRail</Eyebrow>
		<Mono size="meta" tone="muted">Pinned at the bottom of the screen ↓</Mono>
	</section>
</main>

<LinkRail />
