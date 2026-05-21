<script lang="ts">
	// Settings — Defaults (auto-save), Theme, Chawan glyph, Sync stub, About.
	// Defaults persist to chawan:defaults via writeDefaults(); the personal
	// session form reads from the same key on mount.

	import { onMount } from 'svelte';
	import { readDefaults, writeDefaults } from '$lib/sessions/defaults';
	import { preferences } from '$lib/preferences.svelte';
	import { repository } from '$lib/db/repository';
	import { auth, signOut } from '$lib/auth.svelte';
	import {
		SessionSchema,
		STYLE_LABELS,
		TinSchema,
		WHISK_LABELS,
		nowIso,
		type Style,
		type Whisk
	} from '$lib/db/types';

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import Field from '$lib/components/Field.svelte';
	import Segmented from '$lib/components/Segmented.svelte';
	import ChipGroup from '$lib/components/ChipGroup.svelte';
	import Stepper from '$lib/components/Stepper.svelte';
	import PrimaryButton from '$lib/components/PrimaryButton.svelte';

	// Defaults state — populated on mount.
	let style = $state<string>('usucha');
	let waterTempC = $state(76);
	let whisk = $state<string>('chasen-100');
	let loaded = $state(false);
	let lastSaved = $state<string | null>(null);

	// Backup / restore state
	let importing = $state(false);
	let importStatus = $state<{ text: string; ok: boolean } | null>(null);

	// Sign-out state
	let signingOut = $state(false);

	async function handleSignOut() {
		signingOut = true;
		try {
			await signOut();
		} finally {
			signingOut = false;
		}
	}

	async function exportData() {
		const [tins, sessions] = await Promise.all([
			repository.listTins(),
			repository.listSessions()
		]);
		const payload = {
			app: 'chawan',
			version: 'v0.1.0',
			exportedAt: nowIso(),
			tinsCount: tins.length,
			sessionsCount: sessions.length,
			tins,
			sessions
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: 'application/json'
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		const stamp = new Date().toISOString().slice(0, 10);
		a.download = `chawan-backup-${stamp}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function importData(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		importStatus = null;
		importing = true;
		try {
			const text = await file.text();
			const data = JSON.parse(text);
			if (data?.app !== 'chawan') {
				importStatus = { text: 'Not a Chawan backup file.', ok: false };
				return;
			}
			const tinList: unknown[] = Array.isArray(data.tins) ? data.tins : [];
			const sessionList: unknown[] = Array.isArray(data.sessions) ? data.sessions : [];
			let tinsOk = 0;
			let sessionsOk = 0;
			for (const t of tinList) {
				const parsed = TinSchema.safeParse(t);
				if (parsed.success) {
					await repository.saveTin(parsed.data);
					tinsOk++;
				}
			}
			for (const s of sessionList) {
				const parsed = SessionSchema.safeParse(s);
				if (parsed.success) {
					await repository.saveSession(parsed.data);
					sessionsOk++;
				}
			}
			importStatus = {
				text: `Restored ${tinsOk}/${tinList.length} tins · ${sessionsOk}/${sessionList.length} sessions.`,
				ok: true
			};
		} catch {
			importStatus = {
				text: 'Could not parse the file — is it a valid Chawan backup?',
				ok: false
			};
		} finally {
			importing = false;
			target.value = ''; // allow re-picking the same file
		}
	}

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

	<!-- ─── Sync / account ─────────────────────────────────── -->
	<section>
		<Eyebrow>Sync</Eyebrow>

		{#if !auth.enabled}
			<div class="mt-3 flex items-baseline gap-3">
				<span class="bg-muted h-2 w-2 rounded-full"></span>
				<Mono size="m" tone="muted">Not configured</Mono>
			</div>
			<p class="text-muted mt-3 text-[14px] italic">
				Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local (see
				.env.example) and restart the dev server to enable sign-in.
			</p>
		{:else if !auth.ready}
			<div class="mt-3 flex items-baseline gap-3">
				<span class="bg-muted h-2 w-2 rounded-full"></span>
				<Mono size="m" tone="muted">Checking…</Mono>
			</div>
		{:else if auth.user}
			<div class="mt-3 flex items-baseline gap-3">
				<span class="bg-data h-2 w-2 rounded-full"></span>
				<Mono size="m" tone="ink">Signed in</Mono>
			</div>
			<p class="text-muted mt-3 text-[14px] italic break-all">{auth.user.email}</p>
			<p class="text-muted mt-3 text-[14px] italic">
				Cross-device sync arrives in the next update. For now, sign-in unlocks the door — your
				data still lives locally.
			</p>
			<div class="mt-4 text-center">
				<button
					type="button"
					onclick={handleSignOut}
					disabled={signingOut}
					class="text-danger hover:opacity-80 font-mono text-[11px] tracking-[0.10em] uppercase disabled:opacity-40"
				>
					{signingOut ? 'Signing out…' : 'Sign out'}
				</button>
			</div>
		{:else}
			<div class="mt-3 flex items-baseline gap-3">
				<span class="bg-data h-2 w-2 rounded-full"></span>
				<Mono size="m" tone="ink">Local only</Mono>
			</div>
			<p class="text-muted mt-3 text-[14px] italic">
				Sign in to enable cross-device sync (coming next). Your local data stays put — it'll
				migrate to your account on first sign-in.
			</p>
			<div class="mt-4">
				<PrimaryButton kind="line" href="/auth">Sign in</PrimaryButton>
			</div>
		{/if}
	</section>

	<Hairline class="my-7" />

	<!-- ─── Backup ────────────────────────────────────────── -->
	<section>
		<Eyebrow>Backup</Eyebrow>
		<p class="text-muted mt-2 text-[14px] italic">
			Download a JSON snapshot of every tin and session, or restore from a previous export.
			Items with matching IDs are replaced; others are added.
		</p>
		<div class="mt-4 flex flex-col gap-3">
			<button
				type="button"
				onclick={exportData}
				class="border-rule text-ink hover:bg-surface w-full rounded-full border-[0.5px] py-3 font-mono text-[11px] tracking-[0.10em] uppercase transition-colors"
			>
				Download backup
			</button>
			<label
				class="border-rule text-ink hover:bg-surface w-full cursor-pointer rounded-full border-[0.5px] py-3 text-center font-mono text-[11px] tracking-[0.10em] uppercase transition-colors {importing
					? 'opacity-50'
					: ''}"
			>
				{importing ? 'Restoring…' : 'Restore from file'}
				<input
					type="file"
					accept="application/json,.json"
					onchange={importData}
					disabled={importing}
					class="hidden"
				/>
			</label>
		</div>
		{#if importStatus}
			<div
				class="mt-3 rounded-[14px] border-[0.5px] px-4 py-3 {importStatus.ok
					? 'border-tea bg-tea-wash'
					: 'border-danger'}"
			>
				<Mono size="meta" tone="ink">{importStatus.text}</Mono>
			</div>
		{/if}
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
