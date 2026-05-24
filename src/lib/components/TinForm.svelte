<script lang="ts">
	// Shared form for new + edit tin. `tin` undefined = new; defined = edit.
	// Routes:
	//   /tins/new                — wraps with no tin
	//   /tins/[id]/edit          — wraps with the loaded tin
	// Saves through the repository, then navigates back to the list (new)
	// or the detail page (edit).

	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { repository } from '$lib/db/repository';
	import {
		GRADE_LABELS,
		REGION_LABELS,
		SUGGESTED_CULTIVARS,
		newId,
		nowIso,
		type Grade,
		type Region,
		type Tin
	} from '$lib/db/types';
	import { getCatalogEntry } from '$lib/catalog/matcha-catalog';
	import { snapshotForTin } from '$lib/catalog/snapshot';

	import Eyebrow from './Eyebrow.svelte';
	import Display from './Display.svelte';
	import Mono from './Mono.svelte';
	import Hairline from './Hairline.svelte';
	import Field from './Field.svelte';
	import Segmented from './Segmented.svelte';
	import Stepper from './Stepper.svelte';
	import ChipGroup from './ChipGroup.svelte';
	import PrimaryButton from './PrimaryButton.svelte';

	let {
		tin
	}: {
		tin?: Tin;
	} = $props();

	// Snapshot the prop once so the form state initializers don't tie themselves
	// to the prop's reactive graph (we never reuse the same TinForm with a new
	// tin — the edit route only mounts us once the tin has loaded).
	const initial = untrack(() => tin);
	const isEdit = initial !== undefined;

	// URL params:
	//   ?name=...&returnTo=...   — from PersonalSessionForm's "Create new tin" flow
	//   ?catalogId=...           — from /catalog/[id]'s "Add to inventory" CTA
	// The catalog path prefills name/maker/grade/region/cultivar via
	// snapshotForTin and stamps the soft-link `catalogId` onto the new Tin.
	const urlName = untrack(() => page.url.searchParams.get('name') ?? '');
	const urlReturnTo = untrack(() => page.url.searchParams.get('returnTo'));
	const urlCatalogId = untrack(() => page.url.searchParams.get('catalogId') ?? undefined);
	const catalogSnapshot = untrack(() =>
		!initial && urlCatalogId ? (getCatalogEntry(urlCatalogId) ? snapshotForTin(getCatalogEntry(urlCatalogId)!) : null) : null
	);

	let name = $state(initial?.name ?? catalogSnapshot?.name ?? urlName);
	let maker = $state(initial?.maker ?? catalogSnapshot?.maker ?? '');
	let grade = $state<string>(initial?.grade ?? catalogSnapshot?.grade ?? 'ceremonial');
	let region = $state<string>(initial?.region ?? catalogSnapshot?.region ?? 'uji');
	let cultivar = $state(initial?.cultivar ?? catalogSnapshot?.cultivar ?? '');
	let weightGrams = $state(initial?.weightGrams ?? 30);
	let openedAt = $state(initial?.openedAt ?? '');
	let harvestMonth = $state(initial?.harvestDate?.slice(5, 7) ?? '');
	let harvestYear = $state(initial?.harvestDate?.slice(0, 4) ?? '');

	let saving = $state(false);
	let error = $state<string | null>(null);

	const gradeOpts = Object.entries(GRADE_LABELS).map(([value, label]) => ({ value, label }));
	const regionOpts = Object.entries(REGION_LABELS).map(([value, label]) => ({ value, label }));

	const monthOpts = [
		{ value: '01', label: 'Jan' },
		{ value: '02', label: 'Feb' },
		{ value: '03', label: 'Mar' },
		{ value: '04', label: 'Apr' },
		{ value: '05', label: 'May' },
		{ value: '06', label: 'Jun' },
		{ value: '07', label: 'Jul' },
		{ value: '08', label: 'Aug' },
		{ value: '09', label: 'Sep' },
		{ value: '10', label: 'Oct' },
		{ value: '11', label: 'Nov' },
		{ value: '12', label: 'Dec' }
	];

	const currentYear = new Date().getFullYear();
	const yearOpts = Array.from({ length: 6 }, (_, i) => {
		const y = String(currentYear - i);
		return { value: y, label: y };
	});

	const canSave = $derived(name.trim().length > 0 && weightGrams > 0);

	async function save() {
		if (!canSave || saving) return;
		saving = true;
		error = null;
		try {
			const now = nowIso();
			const finalCultivar = cultivar.trim() || undefined;
			const finalHarvest =
				harvestMonth && harvestYear ? `${harvestYear}-${harvestMonth}-01` : undefined;

			// Catalog soft link: carry through on edit (don't drop it),
			// stamp on first save when the user came from the catalog.
			const finalCatalogId = initial?.catalogId ?? catalogSnapshot?.catalogId ?? undefined;

			const next: Tin = {
				id: initial?.id ?? newId(),
				name: name.trim(),
				maker: maker.trim(),
				grade: grade as Grade,
				region: region as Region,
				cultivar: finalCultivar,
				harvestDate: finalHarvest,
				weightGrams,
				openedAt: openedAt || undefined,
				archived: initial?.archived ?? false,
				createdAt: initial?.createdAt ?? now,
				updatedAt: now,
				catalogId: finalCatalogId
			};

			await repository.saveTin(next);

			// If we arrived here from a session form's "Create new tin" flow,
			// return there with ?tinId= so the form can auto-select the new
			// tin and restore the draft.
			if (!isEdit && urlReturnTo) {
				const sep = urlReturnTo.includes('?') ? '&' : '?';
				await goto(`${urlReturnTo}${sep}tinId=${encodeURIComponent(next.id)}`);
				return;
			}
			await goto(isEdit ? `/tins/${next.id}` : '/tins');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save the tin.';
			saving = false;
		}
	}

	function setOpenedNow() {
		openedAt = nowIso();
	}

	function clearOpened() {
		openedAt = '';
	}

	const openedLabel = $derived(
		openedAt
			? new Date(openedAt).toLocaleDateString(undefined, {
					day: 'numeric',
					month: 'short',
					year: 'numeric'
				})
			: 'Not opened yet'
	);
</script>

<main class="mx-auto max-w-md px-6 py-12 pb-28">
	<a
		href={!isEdit && urlReturnTo ? urlReturnTo : isEdit ? `/tins/${initial?.id}` : '/tins'}
		class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
	>
		← back
	</a>

	<div class="mt-8">
		<Eyebrow>{isEdit ? 'Edit tin' : 'New tin'}</Eyebrow>
		<div class="mt-2">
			<Display size="l">{isEdit ? 'Edit' : 'Add a tin'}</Display>
		</div>
	</div>

	<Hairline class="my-7" />

	<Field label="Name">
		<input
			type="text"
			bind:value={name}
			placeholder="Eiju"
			class="text-ink placeholder:text-faint w-full font-display text-[22px] italic"
		/>
	</Field>

	<Field label="Maker">
		<input
			type="text"
			bind:value={maker}
			placeholder="Marukyu Kōyamaen"
			class="text-ink placeholder:text-faint font-body w-full text-[16px]"
		/>
	</Field>

	<Field label="Grade">
		<div class="mt-2">
			<Segmented options={gradeOpts} bind:value={grade} />
		</div>
	</Field>

	<Field label="Region">
		<div class="mt-2">
			<ChipGroup options={regionOpts} bind:value={region} />
		</div>
	</Field>

	<Field label="Cultivar">
		{#snippet action()}
			<Mono size="meta" tone="faint">optional</Mono>
		{/snippet}
		<input
			type="text"
			bind:value={cultivar}
			placeholder="Yabukita, Asahi, …"
			class="text-ink placeholder:text-faint font-body w-full text-[15px]"
		/>
		<div class="mt-2 flex flex-wrap gap-2">
			{#each SUGGESTED_CULTIVARS as c (c)}
				<button
					type="button"
					onclick={() => (cultivar = c)}
					class="border-rule text-muted hover:text-ink rounded-full border-[0.5px] px-2.5 py-1 font-mono text-[11px]"
				>
					{c}
				</button>
			{/each}
		</div>
	</Field>

	<Field label="Harvest">
		{#snippet action()}
			<Mono size="meta" tone="faint">optional</Mono>
		{/snippet}
		<div class="mt-2 space-y-3">
			<ChipGroup options={monthOpts} bind:value={harvestMonth} />
			<ChipGroup options={yearOpts} bind:value={harvestYear} />
		</div>
	</Field>

	<Field label="Weight">
		<Stepper bind:value={weightGrams} min={5} max={500} step={5} unit="g" />
	</Field>

	<Field label="Opened" hairline={false}>
		{#snippet action()}
			{#if openedAt}
				<button
					type="button"
					onclick={clearOpened}
					class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
				>
					clear
				</button>
			{:else}
				<button
					type="button"
					onclick={setOpenedNow}
					class="text-tea font-mono text-[11px] tracking-[0.10em] uppercase"
				>
					open now
				</button>
			{/if}
		{/snippet}
		<Mono size="m" tone={openedAt ? 'ink' : 'faint'}>{openedLabel}</Mono>
	</Field>

	{#if error}
		<div class="bg-tea-wash border-danger mt-6 rounded-[14px] border-[0.5px] px-4 py-3">
			<Mono size="meta" tone="ink">{error}</Mono>
		</div>
	{/if}

	<div class="mt-8">
		<PrimaryButton onclick={save} disabled={!canSave || saving}>
			{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save tin'}
		</PrimaryButton>
	</div>
</main>
