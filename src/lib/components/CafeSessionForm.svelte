<script lang="ts">
	// Cafe session form — used by both /sessions/new/cafe (no prop) and
	// /sessions/[id]/edit (with the session prop set). Same shape as
	// PersonalSessionForm but with cafe-specific fields.

	import { onMount, untrack } from 'svelte';
	import { slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { repository } from '$lib/db/repository';
	import {
		MILK_LABELS,
		REGION_LABELS,
		isCafe,
		newId,
		nowIso,
		type CafeSession,
		type Milk,
		type Region,
		type Style,
		type Tin
	} from '$lib/db/types';
	import {
		CURRENCIES,
		formatPrice,
		getCurrency,
		parsePrice,
		readCurrency,
		writeCurrency
	} from '$lib/sessions/currency';

	import Eyebrow from './Eyebrow.svelte';
	import Display from './Display.svelte';
	import Mono from './Mono.svelte';
	import Hairline from './Hairline.svelte';
	import Field from './Field.svelte';
	import Segmented from './Segmented.svelte';
	import ChipGroup from './ChipGroup.svelte';
	import Rating from './Rating.svelte';
	import PrimaryButton from './PrimaryButton.svelte';

	let {
		session
	}: {
		session?: CafeSession;
	} = $props();

	const initial = untrack(() => session);
	const isEdit = initial !== undefined;

	// Format the initial price as "7.50" / "600" so the input shows it.
	const initialPriceText =
		initial?.priceCents != null
			? formatPrice(initial.priceCents, initial.priceCurrency ?? 'THB').replace(/^[^\d]+/, '')
			: '';

	let cafeName = $state(initial?.cafeName ?? '');
	let maker = $state(initial?.maker ?? '');
	let region = $state<string>(initial?.region ?? 'uji');
	let style = $state<string>(initial?.style ?? 'usucha');
	let milk = $state<string>(initial?.milk ?? '');
	let priceText = $state(initialPriceText);
	let currencyCode = $state<string>(initial?.priceCurrency ?? 'THB');
	let rating = $state(initial?.rating ?? 0);
	let notes = $state(initial?.notes ?? '');
	let brewedAt = $state(initial?.brewedAt ?? nowIso());
	let editingTime = $state(false);

	let cafeSessions = $state<CafeSession[]>([]);
	let tins = $state<Tin[]>([]);
	let loaded = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	const styleOpts = [
		{ value: 'usucha', label: 'Clear' },
		{ value: 'latte', label: 'Latte' }
	];
	const milkOpts = Object.entries(MILK_LABELS).map(([value, label]) => ({ value, label }));
	const regionOpts = Object.entries(REGION_LABELS).map(([value, label]) => ({ value, label }));

	const uniqueCafeNames = $derived.by(() => {
		const set = new Set<string>();
		for (const s of cafeSessions) if (s.cafeName) set.add(s.cafeName);
		return Array.from(set).sort();
	});

	const uniqueMakers = $derived.by(() => {
		const set = new Set<string>();
		for (const t of tins) if (t.maker) set.add(t.maker);
		for (const s of cafeSessions) if (s.maker) set.add(s.maker);
		return Array.from(set).sort();
	});

	const currency = $derived(getCurrency(currencyCode));
	const priceCents = $derived(parsePrice(priceText, currencyCode));

	const canSave = $derived(cafeName.trim().length > 0 && !!region && (style !== 'latte' || !!milk));

	onMount(async () => {
		if (!isEdit) currencyCode = readCurrency();
		const [allSessions, allTins] = await Promise.all([
			repository.listSessions(),
			repository.listTins()
		]);
		cafeSessions = allSessions.filter(isCafe);
		tins = allTins;
		loaded = true;
	});

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

	async function save() {
		if (!canSave || saving) return;
		saving = true;
		error = null;
		try {
			const now = nowIso();
			const next: CafeSession = {
				id: initial?.id ?? newId(),
				kind: 'cafe',
				brewedAt,
				style: style as Style,
				cafeName: cafeName.trim(),
				maker: maker.trim() || undefined,
				region: region as Region,
				priceCents: priceCents > 0 ? priceCents : undefined,
				priceCurrency: priceCents > 0 ? currencyCode : undefined,
				milk: style === 'latte' ? (milk as Milk) : undefined,
				rating: rating || undefined,
				notes: notes.trim() || undefined,
				createdAt: initial?.createdAt ?? now,
				updatedAt: now
			};
			await repository.saveSession(next);
			writeCurrency(currencyCode);
			await goto(isEdit ? `/sessions/${next.id}` : '/');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save the session.';
			saving = false;
		}
	}

	async function deleteSession() {
		if (!isEdit || !initial || saving) return;
		if (!confirm('Delete this session?')) return;
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
		class="font-mono text-[11px] tracking-[0.10em] text-muted uppercase hover:text-ink"
	>
		← back
	</a>

	<div class="mt-8">
		<Eyebrow>{isEdit ? 'Edit session' : 'New session'}</Eyebrow>
		<div class="mt-2">
			<Display size="l">{isEdit ? 'Edit' : 'Cafe'}</Display>
		</div>
	</div>

	<div class="mt-3">
		{#if !editingTime}
			<button
				type="button"
				onclick={() => (editingTime = true)}
				class="font-mono text-[10.5px] font-medium tracking-[0.14em] text-tea uppercase hover:text-ink"
				aria-label="Edit brew time"
			>
				{timeLabel} <span class="ml-1 text-faint">↗</span>
			</button>
		{:else}
			<div class="field-wrapper flex items-center gap-3">
				<input
					type="datetime-local"
					value={brewedAtLocal}
					onchange={onTimeChange}
					class="font-mono text-[14px] text-ink"
				/>
				<button
					type="button"
					onclick={() => (editingTime = false)}
					class="font-mono text-[10.5px] tracking-[0.10em] text-tea uppercase hover:text-ink"
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
	{:else}
		<Field label="Cafe">
			<input
				type="text"
				list="cafe-names"
				bind:value={cafeName}
				placeholder="Stonemill"
				autocomplete="off"
				class="w-full font-display text-[22px] text-ink italic placeholder:text-faint"
			/>
			<datalist id="cafe-names">
				{#each uniqueCafeNames as name (name)}
					<option value={name}></option>
				{/each}
			</datalist>
		</Field>

		<Field label="Matcha brand">
			{#snippet action()}
				<Mono size="meta" tone="faint">optional</Mono>
			{/snippet}
			<input
				type="text"
				list="maker-names"
				bind:value={maker}
				placeholder="Marukyu Kōyamaen"
				autocomplete="off"
				class="w-full font-body text-[15px] text-ink placeholder:text-faint"
			/>
			<datalist id="maker-names">
				{#each uniqueMakers as name (name)}
					<option value={name}></option>
				{/each}
			</datalist>
		</Field>

		<Field label="Region">
			<div class="mt-2">
				<ChipGroup options={regionOpts} bind:value={region} />
			</div>
		</Field>

		<Field label="Style">
			<div class="mt-2">
				<Segmented options={styleOpts} bind:value={style} />
			</div>
		</Field>

		{#if style === 'latte'}
			<div transition:slide={{ duration: 180 }}>
				<Field label="Milk">
					<div class="mt-2">
						<ChipGroup options={milkOpts} bind:value={milk} />
					</div>
				</Field>
			</div>
		{/if}

		<Field label="Price">
			{#snippet action()}
				<select
					bind:value={currencyCode}
					class="bg-transparent font-mono text-[10.5px] font-medium tracking-[0.14em] text-muted uppercase hover:text-ink"
					aria-label="Currency"
				>
					{#each CURRENCIES as c (c.code)}
						<option value={c.code}>{c.code}</option>
					{/each}
				</select>
			{/snippet}
			<div class="flex items-baseline gap-2">
				<span class="font-mono text-[32px] leading-none text-faint">{currency.symbol}</span>
				<input
					type="text"
					inputmode="decimal"
					bind:value={priceText}
					placeholder={currency.decimals === 0 ? '0' : '0.00'}
					autocomplete="off"
					class="w-full font-mono text-[32px] leading-none text-ink tabular-nums placeholder:text-faint"
				/>
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
				class="w-full font-body text-[15px] text-ink italic placeholder:text-faint"
			></textarea>
		</Field>

		{#if error}
			<div class="mt-6 rounded-[14px] border-[0.5px] border-danger bg-tea-wash px-4 py-3">
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
					class="font-mono text-[11px] tracking-[0.10em] text-danger uppercase hover:opacity-80 disabled:opacity-40"
				>
					Delete session
				</button>
			</div>
		{/if}
	{/if}
</main>
