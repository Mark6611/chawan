<script lang="ts">
	// Personal session form — the hardest screen in the app.
	//
	// What's wired:
	// - Tin picker auto-selects the most-recently-used active tin (falls back to
	//   the newest active if none of the user's personal sessions match). Whole
	//   tin row is tappable to swap selection.
	// - Style segmented + a latte sub-fork: when style flips to 'latte', a Milk
	//   chip group appears below.
	// - Powder / water steppers in a 2-column row, with the "After this bowl"
	//   preview line below.
	// - Temperature stepper.
	// - Whisk chip group.
	// - Interactive Rating + notes textarea.
	// - NOW eyebrow at the top — tappable to open a quiet datetime picker for
	//   retrospective logging.
	// - Defaults pre-populated from localStorage (chawan:defaults); Settings
	//   will write to this key in Session 9.
	// - Single full-width Save at the bottom (per flow-review §2; the old
	//   header-pill pattern is dropped).
	//
	// Save flow: create a fresh PersonalSession, persist via repository,
	// navigate to Home so the new "last session" surfaces immediately.

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { repository } from '$lib/db/repository';
	import {
		MILK_LABELS,
		STYLE_LABELS,
		WHISK_LABELS,
		isPersonal,
		newId,
		nowIso,
		type Milk,
		type PersonalSession,
		type Style,
		type Tin,
		type Whisk
	} from '$lib/db/types';
	import { readDefaults } from '$lib/sessions/defaults';
	import { tinRemaining } from '$lib/tins/compute';

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import Field from '$lib/components/Field.svelte';
	import Segmented from '$lib/components/Segmented.svelte';
	import ChipGroup from '$lib/components/ChipGroup.svelte';
	import Stepper from '$lib/components/Stepper.svelte';
	import Rating from '$lib/components/Rating.svelte';
	import PrimaryButton from '$lib/components/PrimaryButton.svelte';

	// ─── form state (mutated by onMount once defaults + tins are loaded) ──
	let style = $state<string>('usucha');
	let powderGrams = $state(2);
	let waterGrams = $state(60);
	let waterTempC = $state(76);
	let whisk = $state<string>('chasen-100');
	let milk = $state<string>('');
	let rating = $state(0);
	let notes = $state('');
	let selectedTinId = $state<string>('');
	let brewedAt = $state(nowIso());
	let editingTime = $state(false);
	let picking = $state(false);

	// ─── data ─────────────────────────────────────────────────────────────
	let tins = $state<Tin[]>([]);
	let personalSessions = $state<PersonalSession[]>([]);
	let loaded = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	const styleOpts = Object.entries(STYLE_LABELS).map(([value, label]) => ({ value, label }));
	const milkOpts = Object.entries(MILK_LABELS).map(([value, label]) => ({ value, label }));
	const whiskOpts = Object.entries(WHISK_LABELS).map(([value, label]) => ({ value, label }));

	const activeTins = $derived(tins.filter((t) => !t.archived));
	const selectedTin = $derived(activeTins.find((t) => t.id === selectedTinId));
	const sessionsForSelected = $derived(
		selectedTin ? personalSessions.filter((s) => s.tinId === selectedTin.id) : []
	);

	const currentRem = $derived(
		selectedTin ? tinRemaining(selectedTin, sessionsForSelected) : 0
	);
	const afterRem = $derived(Math.max(0, currentRem - powderGrams));
	const avgPerSession = $derived.by(() => {
		if (sessionsForSelected.length === 0) return powderGrams;
		const sum = sessionsForSelected.reduce((a, s) => a + s.powderGrams, 0);
		return sum / sessionsForSelected.length;
	});
	const bowlsLeftAfter = $derived(avgPerSession > 0 ? Math.floor(afterRem / avgPerSession) : 0);

	const canSave = $derived(
		!!selectedTinId &&
			powderGrams > 0 &&
			waterGrams > 0 &&
			waterTempC > 0 &&
			(style !== 'latte' || !!milk)
	);

	onMount(async () => {
		// 1) Pull defaults from localStorage (Settings will write here in Session 9).
		const d = readDefaults();
		style = d.style;
		waterTempC = d.waterTempC;
		whisk = d.whisk;
		if (d.powderGrams) powderGrams = d.powderGrams;
		if (d.waterGrams) waterGrams = d.waterGrams;

		// 2) Load tins + all sessions, then pick the most-recently-used active tin.
		const [allTins, allSessions] = await Promise.all([
			repository.listTins(),
			repository.listSessions()
		]);
		tins = allTins;
		personalSessions = allSessions.filter(isPersonal);

		const active = allTins.filter((t) => !t.archived);
		if (active.length > 0) {
			const lastPersonal = allSessions.find(isPersonal);
			const used = lastPersonal && active.find((t) => t.id === lastPersonal.tinId);
			selectedTinId = used ? used.id : active[0].id;
		}

		loaded = true;
	});

	// ─── time-of-brew formatting ──────────────────────────────────────────
	const brewedAtLocal = $derived(isoToLocal(brewedAt));

	function isoToLocal(iso: string): string {
		const d = new Date(iso);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	function localToIso(local: string): string {
		if (!local) return nowIso();
		return new Date(local).toISOString();
	}

	function onTimeChange(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		brewedAt = localToIso(target.value);
	}

	const timeLabel = $derived.by(() => {
		const d = new Date(brewedAt);
		const now = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
		const sameDay = d.toDateString() === now.toDateString();
		const drift = Math.abs(d.getTime() - now.getTime());
		if (sameDay && drift < 60_000) return `NOW · ${hm}`;
		if (sameDay) return `TODAY · ${hm}`;
		const day = d
			.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
			.toUpperCase();
		return `${day} · ${hm}`;
	});

	// ─── save ─────────────────────────────────────────────────────────────
	async function save() {
		if (!canSave || saving) return;
		saving = true;
		error = null;
		try {
			const now = nowIso();
			const session: PersonalSession = {
				id: newId(),
				kind: 'personal',
				brewedAt,
				style: style as Style,
				tinId: selectedTinId,
				powderGrams,
				waterGrams,
				waterTempC,
				whisk: (whisk || undefined) as Whisk | undefined,
				milk: style === 'latte' ? (milk as Milk) : undefined,
				rating: rating || undefined,
				notes: notes.trim() || undefined,
				createdAt: now,
				updatedAt: now
			};
			await repository.saveSession(session);
			await goto('/');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save the session.';
			saving = false;
		}
	}

	function chooseTin(id: string) {
		selectedTinId = id;
		picking = false;
	}
</script>

<main class="mx-auto max-w-md px-6 py-12 pb-28">
	<a
		href="/sessions/new"
		class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
	>
		← back
	</a>

	<div class="mt-8 flex items-baseline justify-between gap-3">
		<div>
			<Eyebrow>New session</Eyebrow>
			<div class="mt-2">
				<Display size="l">Personal</Display>
			</div>
		</div>
	</div>

	<!-- NOW · HH:MM eyebrow — tappable to open the datetime picker -->
	<div class="mt-3">
		{#if !editingTime}
			<button
				type="button"
				onclick={() => (editingTime = true)}
				class="text-tea hover:text-ink font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase"
				aria-label="Edit brew time"
			>
				{timeLabel} <span class="text-faint ml-1">↗</span>
			</button>
		{:else}
			<div class="field-wrapper flex items-center gap-3">
				<input
					type="datetime-local"
					value={brewedAtLocal}
					onchange={onTimeChange}
					class="text-ink font-mono text-[14px]"
				/>
				<button
					type="button"
					onclick={() => (editingTime = false)}
					class="text-tea hover:text-ink font-mono text-[10.5px] tracking-[0.10em] uppercase"
				>
					done
				</button>
			</div>
		{/if}
	</div>

	<Hairline class="my-7" />

	{#if !loaded}
		<div class="mt-8 text-center">
			<Mono size="meta" tone="muted">Loading…</Mono>
		</div>
	{:else if activeTins.length === 0}
		<!-- No tins → can't log a personal session -->
		<div class="flex flex-col items-center text-center">
			<Display size="m">No tins yet.</Display>
			<p class="text-muted mt-4 max-w-[26ch] text-[14px] italic">
				Add a tin first — personal sessions deduct from your inventory.
			</p>
			<div class="mt-8 w-full">
				<PrimaryButton href="/tins/new">Add a tin</PrimaryButton>
			</div>
		</div>
	{:else}
		<!-- ─── Tin picker ──────────────────────────────────── -->
		<Field label="Tin">
			{#snippet action()}
				{#if !picking && activeTins.length > 1}
					<button
						type="button"
						onclick={() => (picking = true)}
						class="text-tea hover:text-ink font-mono text-[10.5px] tracking-[0.14em] uppercase"
					>
						change
					</button>
				{:else if picking}
					<button
						type="button"
						onclick={() => (picking = false)}
						class="text-muted hover:text-ink font-mono text-[10.5px] tracking-[0.14em] uppercase"
					>
						cancel
					</button>
				{/if}
			{/snippet}

			{#if !picking && selectedTin}
				<button
					type="button"
					onclick={() => activeTins.length > 1 && (picking = true)}
					class="flex w-full items-baseline justify-between gap-3 text-left"
					aria-label="Selected tin"
				>
					<span class="min-w-0 flex-1">
						<span class="text-ink block font-display text-[22px] italic">{selectedTin.name}</span>
						<span class="text-muted mt-0.5 block font-mono text-[11px]"
							>{selectedTin.maker} · {currentRem.toFixed(0)}g left</span
						>
					</span>
					{#if activeTins.length > 1}
						<span class="text-faint font-mono text-[14px]">›</span>
					{/if}
				</button>
			{:else if picking}
				<ul class="border-hairline border-t">
					{#each activeTins as t (t.id)}
						{@const r = tinRemaining(
							t,
							personalSessions.filter((s) => s.tinId === t.id)
						)}
						<li class="border-hairline border-b">
							<button
								type="button"
								onclick={() => chooseTin(t.id)}
								class="flex w-full items-baseline justify-between gap-3 py-3 text-left"
								aria-pressed={t.id === selectedTinId}
							>
								<span class="min-w-0 flex-1">
									<span
										class="block font-display text-[18px] italic {t.id === selectedTinId
											? 'text-tea'
											: 'text-ink'}"
									>
										{t.name}
									</span>
									<span class="text-muted mt-0.5 block font-mono text-[11px]"
										>{t.maker}</span
									>
								</span>
								<span class="text-muted font-mono text-[11px] tabular-nums"
									>{r.toFixed(0)}g</span
								>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</Field>

		<!-- ─── Style + (latte → milk) sub-fork ─────────────── -->
		<Field label="Style">
			<div class="mt-2">
				<Segmented options={styleOpts} bind:value={style} />
			</div>
		</Field>

		{#if style === 'latte'}
			<Field label="Milk">
				<div class="mt-2">
					<ChipGroup options={milkOpts} bind:value={milk} />
				</div>
			</Field>
		{/if}

		<!-- ─── Powder + Water in a 2-col grid + After-this-bowl preview ─── -->
		<div class="field-wrapper border-hairline border-b py-[14px]">
			<div class="grid grid-cols-2 gap-6">
				<div class="flex flex-col gap-2">
					<Eyebrow>Powder</Eyebrow>
					<Stepper bind:value={powderGrams} min={0.5} max={10} step={0.1} digits={1} unit="g" />
				</div>
				<div class="flex flex-col gap-2">
					<Eyebrow>Water</Eyebrow>
					<Stepper bind:value={waterGrams} min={5} max={400} step={5} unit="g" />
				</div>
			</div>

			{#if selectedTin}
				<div class="mt-4">
					<Mono size="meta" tone="muted">
						After this bowl: {afterRem.toFixed(0)}g in {selectedTin.name}
						{#if bowlsLeftAfter > 0} · ~{bowlsLeftAfter} bowls left{/if}
					</Mono>
				</div>
			{/if}
		</div>

		<!-- ─── Temperature ────────────────────────────────── -->
		<Field label="Temperature">
			<Stepper bind:value={waterTempC} min={50} max={100} step={1} unit="°C" />
		</Field>

		<!-- ─── Whisk ──────────────────────────────────────── -->
		<Field label="Whisk">
			<div class="mt-2">
				<ChipGroup options={whiskOpts} bind:value={whisk} />
			</div>
		</Field>

		<!-- ─── Rating ─────────────────────────────────────── -->
		<Field label="Rating">
			<div class="mt-2">
				<Rating bind:value={rating} interactive size={12} />
			</div>
		</Field>

		<!-- ─── Notes ──────────────────────────────────────── -->
		<Field label="Notes" hairline={false}>
			<textarea
				bind:value={notes}
				rows="3"
				placeholder="How was it?"
				class="text-ink placeholder:text-faint font-body w-full text-[15px] italic"
			></textarea>
		</Field>

		{#if error}
			<div class="bg-tea-wash border-danger mt-6 rounded-[14px] border-[0.5px] px-4 py-3">
				<Mono size="meta" tone="ink">{error}</Mono>
			</div>
		{/if}

		<div class="mt-8">
			<PrimaryButton onclick={save} disabled={!canSave || saving}>
				{saving ? 'Saving…' : 'Save session'}
			</PrimaryButton>
		</div>
	{/if}
</main>
