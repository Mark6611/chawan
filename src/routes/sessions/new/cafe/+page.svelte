<script lang="ts">
	// Cafe-bought session form.
	//
	// Layout mirrors the personal form (NOW eyebrow → fields → Save) but the
	// fields shrink to what's relevant when someone else brewed: cafe name,
	// optional matcha brand, region, style (Clear or Latte — koicha is unusual
	// at a cafe per the product spec), milk on latte, optional price + sticky
	// currency, rating + notes.
	//
	// Autocomplete is wired with native <datalist> so we don't ship a custom
	// dropdown — the browser does the matching as you type.
	// Currency is sticky via src/lib/sessions/currency.ts.

	import { onMount } from 'svelte';
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
		getCurrency,
		parsePrice,
		readCurrency,
		writeCurrency
	} from '$lib/sessions/currency';

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import Field from '$lib/components/Field.svelte';
	import Segmented from '$lib/components/Segmented.svelte';
	import ChipGroup from '$lib/components/ChipGroup.svelte';
	import Rating from '$lib/components/Rating.svelte';
	import PrimaryButton from '$lib/components/PrimaryButton.svelte';

	// ─── form state ──────────────────────────────────────────────────────
	let cafeName = $state('');
	let maker = $state('');
	let region = $state<string>('uji');
	let style = $state<string>('usucha'); // Clear ↔ usucha at the schema level
	let milk = $state<string>('');
	let priceText = $state('');
	let currencyCode = $state<string>('USD');
	let rating = $state(0);
	let notes = $state('');
	let brewedAt = $state(nowIso());
	let editingTime = $state(false);

	// ─── data ────────────────────────────────────────────────────────────
	let cafeSessions = $state<CafeSession[]>([]);
	let tins = $state<Tin[]>([]);
	let loaded = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	// Cafe-form style is just Clear (= usucha) or Latte. Koicha isn't an
	// option here per the product spec.
	const styleOpts = [
		{ value: 'usucha', label: 'Clear' },
		{ value: 'latte', label: 'Latte' }
	];
	const milkOpts = Object.entries(MILK_LABELS).map(([value, label]) => ({ value, label }));
	const regionOpts = Object.entries(REGION_LABELS).map(([value, label]) => ({ value, label }));

	// Autocomplete corpora
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

	// Current currency info (symbol, decimals)
	const currency = $derived(getCurrency(currencyCode));
	const priceCents = $derived(parsePrice(priceText, currencyCode));

	const canSave = $derived(
		cafeName.trim().length > 0 && !!region && (style !== 'latte' || !!milk)
	);

	onMount(async () => {
		currencyCode = readCurrency();
		const [allSessions, allTins] = await Promise.all([
			repository.listSessions(),
			repository.listTins()
		]);
		cafeSessions = allSessions.filter(isCafe);
		tins = allTins;
		loaded = true;
	});

	// ─── time-of-brew (mirrors the personal form) ────────────────────────
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

	// ─── save ────────────────────────────────────────────────────────────
	async function save() {
		if (!canSave || saving) return;
		saving = true;
		error = null;
		try {
			const now = nowIso();
			const session: CafeSession = {
				id: newId(),
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
				createdAt: now,
				updatedAt: now
			};
			await repository.saveSession(session);
			writeCurrency(currencyCode); // sticky for next time
			await goto('/');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save the session.';
			saving = false;
		}
	}
</script>

<main class="mx-auto max-w-md px-6 py-12 pb-28">
	<a
		href="/sessions/new"
		class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
	>
		← back
	</a>

	<div class="mt-8">
		<Eyebrow>New session</Eyebrow>
		<div class="mt-2">
			<Display size="l">Cafe</Display>
		</div>
	</div>

	<!-- NOW · HH:MM tappable eyebrow -->
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
	{:else}
		<!-- ─── Cafe name ──────────────────────────────────── -->
		<Field label="Cafe">
			<input
				type="text"
				list="cafe-names"
				bind:value={cafeName}
				placeholder="Stonemill"
				autocomplete="off"
				class="text-ink placeholder:text-faint w-full font-display text-[22px] italic"
			/>
			<datalist id="cafe-names">
				{#each uniqueCafeNames as name (name)}
					<option value={name}></option>
				{/each}
			</datalist>
		</Field>

		<!-- ─── Matcha brand (optional) ────────────────────── -->
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
				class="text-ink placeholder:text-faint font-body w-full text-[15px]"
			/>
			<datalist id="maker-names">
				{#each uniqueMakers as name (name)}
					<option value={name}></option>
				{/each}
			</datalist>
		</Field>

		<!-- ─── Region ─────────────────────────────────────── -->
		<Field label="Region">
			<div class="mt-2">
				<ChipGroup options={regionOpts} bind:value={region} />
			</div>
		</Field>

		<!-- ─── Style (Clear / Latte) ──────────────────────── -->
		<Field label="Style">
			<div class="mt-2">
				<Segmented options={styleOpts} bind:value={style} />
			</div>
		</Field>

		<!-- ─── Milk (latte sub-fork) ──────────────────────── -->
		{#if style === 'latte'}
			<Field label="Milk">
				<div class="mt-2">
					<ChipGroup options={milkOpts} bind:value={milk} />
				</div>
			</Field>
		{/if}

		<!-- ─── Price (optional) + currency in action slot ─── -->
		<Field label="Price">
			{#snippet action()}
				<select
					bind:value={currencyCode}
					class="text-muted hover:text-ink bg-transparent font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase"
					aria-label="Currency"
				>
					{#each CURRENCIES as c (c.code)}
						<option value={c.code}>{c.code}</option>
					{/each}
				</select>
			{/snippet}
			<div class="flex items-baseline gap-2">
				<span class="text-faint font-mono text-[32px] leading-none">{currency.symbol}</span>
				<input
					type="text"
					inputmode="decimal"
					bind:value={priceText}
					placeholder={currency.decimals === 0 ? '0' : '0.00'}
					autocomplete="off"
					class="text-ink placeholder:text-faint w-full font-mono text-[32px] leading-none tabular-nums"
				/>
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
