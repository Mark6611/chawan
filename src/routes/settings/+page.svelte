<script lang="ts">
	// Settings — Defaults (auto-save), Theme, Chawan glyph, Sync stub, About.
	// Defaults persist to chawan:defaults via writeDefaults(); the personal
	// session form reads from the same key on mount.

	import { onMount } from 'svelte';
	import { readDefaults, writeDefaults } from '$lib/sessions/defaults';
	import { preferences } from '$lib/preferences.svelte';
	import { STYLE_LABELS, WHISK_LABELS, type Style, type Whisk } from '$lib/db/types';

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import Field from '$lib/components/Field.svelte';
	import Segmented from '$lib/components/Segmented.svelte';
	import ChipGroup from '$lib/components/ChipGroup.svelte';
	import Stepper from '$lib/components/Stepper.svelte';

	// Defaults state — populated on mount.
	let style = $state<string>('usucha');
	let waterTempC = $state(76);
	let whisk = $state<string>('chasen-100');
	let loaded = $state(false);
	let lastSaved = $state<string | null>(null);

	const styleOpts = Object.entries(STYLE_LABELS).map(([value, label]) => ({ value, label }));
	const whiskOpts = Object.entries(WHISK_LABELS).map(([value, label]) => ({ value, label }));
	const themeOpts = [
		{ value: 'day', label: 'Day' },
		{ value: 'night', label: 'Night' }
	];
	const glyphOpts = [
		{ value: 'show', label: 'Show' },
		{ value: 'hide', label: 'Hide' }
	];

	onMount(() => {
		const d = readDefaults();
		style = d.style;
		waterTempC = d.waterTempC;
		whisk = d.whisk;
		loaded = true;
	});

	// Auto-save defaults whenever the controlled fields change.
	// The first run after onMount writes back the freshly-loaded values
	// (harmless no-op), so we don't gate it.
	$effect(() => {
		if (!loaded) return;
		// Force reactive reads so the effect re-runs on changes.
		void style;
		void waterTempC;
		void whisk;
		writeDefaults({
			style: style as Style,
			waterTempC,
			whisk: whisk as Whisk
		});
		const t = new Date();
		lastSaved = `Saved · ${t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
	});
</script>

<main class="mx-auto max-w-md px-6 py-12 pb-28">
	<Eyebrow>App</Eyebrow>
	<div class="mt-2">
		<Display size="l">Settings</Display>
	</div>

	<Hairline class="my-7" />

	<!-- ─── Defaults ──────────────────────────────────────── -->
	<section>
		<div class="flex items-baseline justify-between gap-3">
			<Eyebrow>Defaults</Eyebrow>
			{#if lastSaved}
				<Mono size="meta" tone="faint">{lastSaved}</Mono>
			{/if}
		</div>
		<p class="text-muted mt-2 text-[14px] italic">
			Applied when you open a new personal session.
		</p>

		<div class="mt-4">
			<Field label="Default style">
				<div class="mt-2">
					<Segmented options={styleOpts} bind:value={style} />
				</div>
			</Field>

			<Field label="Default water temp">
				<Stepper bind:value={waterTempC} min={50} max={100} step={1} unit="°C" />
			</Field>

			<Field label="Default whisk" hairline={false}>
				<div class="mt-2">
					<ChipGroup options={whiskOpts} bind:value={whisk} />
				</div>
			</Field>
		</div>
	</section>

	<Hairline class="my-7" />

	<!-- ─── Theme ─────────────────────────────────────────── -->
	<section>
		<Eyebrow>Theme</Eyebrow>
		<p class="text-muted mt-2 text-[14px] italic">
			Day is wood + white + ink. Night is deep earth with a tea-green accent.
		</p>
		<div class="mt-3">
			<Segmented
				options={themeOpts}
				value={preferences.theme}
				onchange={(v) => preferences.setTheme(v as 'day' | 'night')}
			/>
		</div>
	</section>

	<Hairline class="my-7" />

	<!-- ─── Chawan glyph ──────────────────────────────────── -->
	<section>
		<Eyebrow>Chawan glyph</Eyebrow>
		<p class="text-muted mt-2 text-[14px] italic">
			Hide the bowl mark if you'd rather the layout speak for itself.
		</p>
		<div class="mt-3">
			<Segmented
				options={glyphOpts}
				value={preferences.hideChawan ? 'hide' : 'show'}
				onchange={(v) => preferences.setHideChawan(v === 'hide')}
			/>
		</div>
	</section>

	<Hairline class="my-7" />

	<!-- ─── Sync (stub for Phase 2) ───────────────────────── -->
	<section>
		<Eyebrow>Sync</Eyebrow>
		<div class="mt-3 flex items-baseline gap-3">
			<span class="bg-data h-2 w-2 rounded-full"></span>
			<Mono size="m" tone="ink">Local only</Mono>
		</div>
		<p class="text-muted mt-3 text-[14px] italic">
			Phase 2 will add magic-link sign-in and cross-device sync via Supabase. Your data stays in
			this browser until then.
		</p>
	</section>

	<Hairline class="my-7" />

	<!-- ─── About ─────────────────────────────────────────── -->
	<section>
		<Eyebrow>About</Eyebrow>
		<div class="mt-2">
			<Display size="m">Chawan</Display>
		</div>
		<p class="text-muted mt-2 text-[14px] italic">A personal log for matcha sessions.</p>
		<div class="mt-3">
			<Mono size="meta" tone="muted">v0.1.0 · local-only · Phase 1</Mono>
		</div>
	</section>
</main>
