<script lang="ts">
	// Personal session form — used by both /sessions/new/personal (no prop)
	// and /sessions/[id]/edit (with the session prop set).
	//
	// Reactive shape:
	//   - `session` undefined → new mode; defaults from localStorage, auto-pick tin.
	//   - `session` defined   → edit mode; state initialized from the record.
	//
	// We snapshot the prop via untrack() (same pattern as TinForm) so the
	// $state initializers don't trip Svelte 5's state_referenced_locally rule.
	//
	// Tin re-balance on edit is a no-op: tinRemaining is derived from session
	// records at read time, so changing a session's tinId or powderGrams
	// automatically credits the old tin and debits the new one with no
	// explicit transaction logic.

	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
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
	import { hasCustomDefaults, readDefaults } from '$lib/sessions/defaults';
	import { tinRemaining } from '$lib/tins/compute';

	import Eyebrow from './Eyebrow.svelte';
	import Display from './Display.svelte';
	import Mono from './Mono.svelte';
	import Hairline from './Hairline.svelte';
	import Field from './Field.svelte';
	import Segmented from './Segmented.svelte';
	import ChipGroup from './ChipGroup.svelte';
	import Stepper from './Stepper.svelte';
	import Rating from './Rating.svelte';
	import PrimaryButton from './PrimaryButton.svelte';
	import TinPicker from './TinPicker.svelte';

	let {
		session
	}: {
		session?: PersonalSession;
	} = $props();

	const initial = untrack(() => session);
	const isEdit = initial !== undefined;

	// ─── form state — initialized from `initial` when editing ────────────
	let style = $state<string>(initial?.style ?? 'usucha');
	let powderGrams = $state(initial?.powderGrams ?? 2);
	let waterGrams = $state(initial?.waterGrams ?? 60);
	let waterTempC = $state(initial?.waterTempC ?? 76);
	let whisk = $state<string>(initial?.whisk ?? 'chasen-100');
	let milk = $state<string>(initial?.milk ?? '');
	let rating = $state(initial?.rating ?? 0);
	let notes = $state(initial?.notes ?? '');
	let selectedTinId = $state<string>(initial?.tinId ?? '');
	let brewedAt = $state(initial?.brewedAt ?? nowIso());
	let editingTime = $state(false);
	let showDefaultsBanner = $state(false);

	// Session-storage draft key. Lets us survive a round-trip to /tins/new
	// when the user picks "Create new tin" from the TinPicker.
	const DRAFT_KEY = 'chawan:personal-draft';

	// ─── data ────────────────────────────────────────────────────────────
	let tins = $state<Tin[]>([]);
	let personalSessions = $state<PersonalSession[]>([]);
	let loaded = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	const styleOpts = Object.entries(STYLE_LABELS).map(([value, label]) => ({ value, label }));
	const milkOpts = Object.entries(MILK_LABELS).map(([value, label]) => ({ value, label }));
	const whiskOpts = Object.entries(WHISK_LABELS).map(([value, label]) => ({ value, label }));

	const activeTins = $derived(tins.filter((t) => !t.archived));
	const selectedTin = $derived(
		// In edit mode we may need to surface a tin that's now archived (the
		// user shouldn't be locked out of editing past sessions when they've
		// archived the tin they used). Look in *all* tins, not just active.
		tins.find((t) => t.id === selectedTinId)
	);
	const sessionsForSelected = $derived(
		selectedTin
			? personalSessions
					.filter((s) => s.tinId === selectedTin.id)
					.filter((s) => !isEdit || s.id !== initial!.id) // exclude the session-being-edited from its own remaining math
			: []
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
		// In new mode, pre-populate from localStorage defaults.
		if (!isEdit) {
			const d = readDefaults();
			style = d.style;
			waterTempC = d.waterTempC;
			whisk = d.whisk;
			if (d.powderGrams) powderGrams = d.powderGrams;
			if (d.waterGrams) waterGrams = d.waterGrams;
			// Only surface the banner when the user has actually saved
			// custom defaults — otherwise it's noise about hard-coded values.
			showDefaultsBanner = hasCustomDefaults();
		}

		const [allTins, allSessions] = await Promise.all([
			repository.listTins(),
			repository.listSessions()
		]);
		tins = allTins;
		personalSessions = allSessions.filter(isPersonal);

		// New mode: auto-pick most recently used active tin.
		// Edit mode: selectedTinId already set from initial.tinId.
		if (!isEdit) {
			const active = allTins.filter((t) => !t.archived);
			if (active.length > 0) {
				const lastPersonal = allSessions.find(isPersonal);
				const used = lastPersonal && active.find((t) => t.id === lastPersonal.tinId);
				selectedTinId = used ? used.id : active[0].id;
			}

			// Restore form state from sessionStorage (set if we bounced through
			// /tins/new). Then clear the draft so a future fresh mount doesn't
			// re-apply stale state.
			if (typeof sessionStorage !== 'undefined') {
				try {
					const raw = sessionStorage.getItem(DRAFT_KEY);
					if (raw) {
						const d = JSON.parse(raw);
						if (typeof d.style === 'string') style = d.style;
						if (typeof d.powderGrams === 'number') powderGrams = d.powderGrams;
						if (typeof d.waterGrams === 'number') waterGrams = d.waterGrams;
						if (typeof d.waterTempC === 'number') waterTempC = d.waterTempC;
						if (typeof d.whisk === 'string') whisk = d.whisk;
						if (typeof d.milk === 'string') milk = d.milk;
						if (typeof d.rating === 'number') rating = d.rating;
						if (typeof d.notes === 'string') notes = d.notes;
						if (typeof d.brewedAt === 'string') brewedAt = d.brewedAt;
					}
					sessionStorage.removeItem(DRAFT_KEY);
				} catch {
					// ignore malformed draft
				}
			}

			// URL ?tinId= overrides (after returning from /tins/new). It wins
			// over the auto-pick + the draft's selectedTinId.
			const urlTinId = page.url.searchParams.get('tinId');
			if (urlTinId) selectedTinId = urlTinId;
		}

		loaded = true;
	});

	function handleCreateNewTin(name: string) {
		// Persist the form state so the user doesn't lose what they've typed.
		const draft = {
			style,
			powderGrams,
			waterGrams,
			waterTempC,
			whisk,
			milk,
			rating,
			notes,
			brewedAt
		};
		try {
			sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
		} catch {
			// storage full / disabled — proceed anyway; user just loses form state
		}
		const params = new URLSearchParams();
		if (name) params.set('name', name);
		params.set('returnTo', '/sessions/new/personal');
		void goto(`/tins/new?${params.toString()}`);
	}

	// ─── time-of-brew ─────────────────────────────────────────────────────
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

	// ─── save / delete ────────────────────────────────────────────────────
	async function save() {
		if (!canSave || saving) return;
		saving = true;
		error = null;
		try {
			const now = nowIso();
			const next: PersonalSession = {
				id: initial?.id ?? newId(),
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
				createdAt: initial?.createdAt ?? now,
				updatedAt: now
			};
			await repository.saveSession(next);
			await goto(isEdit ? `/sessions/${next.id}` : '/');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save the session.';
			saving = false;
		}
	}

	async function deleteSession() {
		if (!isEdit || !initial || saving) return;
		if (!confirm('Delete this session? Tin remaining will be restored automatically.')) return;
		saving = true;
		error = null;
		try {
			await repository.deleteSession(initial.id);
			await goto('/sessions');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not delete the session.';
			saving = false;
		}
	}

	const backHref = $derived(isEdit ? `/sessions/${initial?.id}` : '/sessions/new');
</script>

<main class="mx-auto max-w-md px-6 py-12 pb-28">
	<a
		href={backHref}
		class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
	>
		← back
	</a>

	<div class="mt-8">
		<Eyebrow>{isEdit ? 'Edit session' : 'New session'}</Eyebrow>
		<div class="mt-2">
			<Display size="l">{isEdit ? 'Edit' : 'Personal'}</Display>
		</div>
	</div>

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
	{:else if !isEdit && activeTins.length === 0}
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
		{#if showDefaultsBanner}
			<div
				class="border-tea bg-tea-wash mb-4 flex items-center justify-between rounded-full border-[0.5px] py-2 pl-4 pr-2"
			>
				<span
					class="text-tea font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase"
				>
					Defaults applied · tap any field to change
				</span>
				<button
					type="button"
					onclick={() => (showDefaultsBanner = false)}
					aria-label="Dismiss"
					class="text-muted hover:text-ink grid h-6 w-6 place-items-center font-mono text-[16px] leading-none"
				>
					×
				</button>
			</div>
		{/if}

		<!-- Tin picker (typeahead + Create new) -->
		<Field label="Tin">
			<div class="mt-2">
				<TinPicker
					bind:tinId={selectedTinId}
					{tins}
					{personalSessions}
					excludeSessionId={isEdit ? initial?.id : undefined}
					oncreatenew={handleCreateNewTin}
				/>
			</div>
		</Field>

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

		<Field label="Temperature">
			<Stepper bind:value={waterTempC} min={50} max={100} step={1} unit="°C" />
		</Field>

		<Field label="Whisk">
			<div class="mt-2">
				<ChipGroup options={whiskOpts} bind:value={whisk} />
			</div>
		</Field>

		<Field label="Rating">
			<div class="mt-2">
				<Rating bind:value={rating} interactive size={12} />
			</div>
		</Field>

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
				{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save session'}
			</PrimaryButton>
		</div>

		{#if isEdit}
			<div class="mt-6 text-center">
				<button
					type="button"
					onclick={deleteSession}
					disabled={saving}
					class="text-danger hover:opacity-80 font-mono text-[11px] tracking-[0.10em] uppercase disabled:opacity-40"
				>
					Delete session
				</button>
			</div>
		{/if}
	{/if}
</main>
