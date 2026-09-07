<script lang="ts">
	// Settings — Defaults (auto-save), Theme, Chawan glyph, Sync stub, About.
	// Defaults persist to chawan:defaults via writeDefaults(); the personal
	// session form reads from the same key on mount.

	import { onMount } from 'svelte';
	import { readDefaults, writeDefaults } from '$lib/sessions/defaults';
	import { preferences } from '$lib/preferences.svelte';
	import { buildBackup, restoreBackup, QuotaError } from '$lib/db/backup';
	import { repository } from '$lib/db/repository';
	import type { Session } from '$lib/db/types';
	import { shareOrDownload } from '$lib/share/share-card';
	import { STYLE_LABELS, WHISK_LABELS, type Style, type Whisk } from '$lib/db/types';

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import Field from '$lib/components/Field.svelte';
	import Segmented from '$lib/components/Segmented.svelte';
	import ChipGroup from '$lib/components/ChipGroup.svelte';
	import Stepper from '$lib/components/Stepper.svelte';
	import Button from '$lib/components/Button.svelte';

	// Defaults state — populated on mount.
	let style = $state<string>('usucha');
	let waterTempC = $state(76);
	let whisk = $state<string>('chasen-100');
	let loaded = $state(false);
	let lastSaved = $state<string | null>(null);

	// Recently deleted — the undo surface for session deletion. Tombstones keep
	// the whole row, so this data was always there; nothing could reach it.
	let deletedSessions = $state<Session[]>([]);
	let restoringId = $state<string | null>(null);
	async function loadDeleted() {
		deletedSessions = await repository.listDeletedSessions();
	}
	async function undelete(id: string) {
		if (restoringId) return;
		restoringId = id;
		try {
			await repository.undeleteSession(id);
			await loadDeleted();
		} finally {
			restoringId = null;
		}
	}
	const deletedLabel = (s: Session) => {
		const when = new Date(s.brewedAt).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric'
		});
		return `${STYLE_LABELS[s.style]} · ${when}`;
	};

	// Backup / restore state
	let exporting = $state(false);
	let importing = $state(false);
	let importStatus = $state<{ text: string; ok: boolean } | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);

	async function exportData() {
		exporting = true;
		importStatus = null;
		try {
			const payload = await buildBackup(__APP_VERSION__);
			const now = new Date();
			const pad = (n: number) => String(n).padStart(2, '0');
			const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
			const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
			// shareOrDownload handles the iOS WKWebView (Filesystem + Share) as
			// well as the web download — a raw <a download> no-ops on native.
			await shareOrDownload(blob, `chawan-backup-${stamp}.json`);
		} catch {
			importStatus = { text: 'Could not create the backup file.', ok: false };
		} finally {
			exporting = false;
		}
	}

	async function importData(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		importStatus = null;

		let data: unknown;
		try {
			data = JSON.parse(await file.text());
		} catch {
			importStatus = { text: 'Could not read the file — is it valid JSON?', ok: false };
			target.value = '';
			return;
		}

		// Confirm before merging into the sole local copy. The header fields
		// (present since v1) let the dialog name the backup so a mis-tapped or
		// stale file is caught before it touches anything. A non-Chawan file
		// skips the prompt and lets restoreBackup throw the proper error.
		const header = data as {
			app?: string;
			exportedAt?: string;
			tinsCount?: number;
			sessionsCount?: number;
		};
		if (header?.app === 'chawan') {
			const when =
				typeof header.exportedAt === 'string'
					? new Date(header.exportedAt).toLocaleDateString(undefined, {
							year: 'numeric',
							month: 'short',
							day: 'numeric'
						})
					: 'an unknown date';
			const t = Number(header.tinsCount) || 0;
			const s = Number(header.sessionsCount) || 0;
			const proceed = confirm(
				`Restore from the backup taken ${when}?\n\n` +
					`${t} tin${t === 1 ? '' : 's'} · ${s} session${s === 1 ? '' : 's'}. ` +
					`Items merge by most-recent edit — newer copies already on this device are kept.`
			);
			if (!proceed) {
				target.value = '';
				return;
			}
		}

		importing = true;
		try {
			const r = await restoreBackup(data);
			const skipped = r.tinsInvalid + r.sessionsInvalid;
			const kept = r.tinsKept + r.sessionsKept + r.photosKept;
			const parts = [
				`${r.tinsAdded} tin${r.tinsAdded === 1 ? '' : 's'}`,
				`${r.sessionsAdded} session${r.sessionsAdded === 1 ? '' : 's'}`
			];
			if (r.photos) parts.push(`${r.photos} photo${r.photos === 1 ? '' : 's'}`);
			let text = `Restored ${parts.join(' · ')}.`;
			if (kept > 0) text += ` Kept ${kept} newer local item(s).`;
			if (skipped > 0) text += ` Skipped ${skipped} invalid.`;
			if (r.photosFailed > 0)
				text += ` ${r.photosFailed} photo${r.photosFailed === 1 ? '' : 's'} could not be saved.`;
			if (r.photosSkipped > 0)
				text += ` ${r.photosSkipped} photo${r.photosSkipped === 1 ? '' : 's'} had no matching tin.`;
			// Nothing that was LOST may render as success. This used to gate on
			// photosFailed alone, so a file whose tins and sessions all failed
			// validation — the rows are in the file and will never come back —
			// showed the green "Restored 0 tins · 0 sessions. Skipped 40 invalid."
			// Kept items are not loss: those are newer local copies, working as
			// intended.
			const lost = skipped + r.photosFailed + r.photosSkipped;
			importStatus = { text, ok: lost === 0 };
		} catch (err) {
			let text: string;
			if (err instanceof QuotaError) {
				// Say what survived. The restore is idempotent, so re-running the
				// same file after freeing space finishes it rather than starting
				// over — but only if the user knows that.
				const p = err.partial;
				const landed = p ? p.tinsAdded + p.sessionsAdded + p.photos : 0;
				text = landed
					? `${err.message} ${landed} item(s) were restored before it ran out — free up space and restore the same file again to finish.`
					: err.message;
			} else if (err instanceof Error && /newer version of Chawan/i.test(err.message)) {
				text = err.message;
			} else if (err instanceof Error && err.message === 'Not a Chawan backup file.') {
				text = err.message;
			} else {
				text = 'Could not read the file — is it a valid Chawan backup?';
			}
			importStatus = { text, ok: false };
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
		void loadDeleted();
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
		<p class="mt-2 text-[14px] text-muted italic">Applied when you open a new personal session.</p>

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
		<p class="mt-2 text-[14px] text-muted italic">
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
		<p class="mt-2 text-[14px] text-muted italic">
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

	<!-- ─── Storage ────────────────────────────────────────── -->
	<section>
		<Eyebrow>Storage</Eyebrow>
		<div class="mt-3 flex items-baseline gap-3">
			<span class="h-2 w-2 rounded-full bg-data"></span>
			<Mono size="m" tone="ink">On this device</Mono>
		</div>
		<p class="mt-3 max-w-[38ch] text-[14px] text-muted italic">
			Your matcha log lives entirely on this device — nothing is collected or sent anywhere. Back it
			up below to keep a copy or move it to a new phone.
		</p>
		{#if preferences.storagePersisted === false}
			<p class="mt-3 max-w-[38ch] text-[13px] text-danger">
				This browser has not granted persistent storage, so it may clear your log if the device runs
				low on space or you leave the app unused for a while. Downloading a backup is the only way
				to be safe.
			</p>
		{/if}
	</section>

	<Hairline class="my-7" />

	<!-- ─── Recently deleted ─────────────────────────────
	     Deleting a session stamps a tombstone whose updatedAt is NEWER than any
	     earlier backup's copy, so restoring a backup cannot bring it back — by
	     design, or an old file would resurrect everything ever deleted. That
	     left an accidental tap with no recovery path at all. The tombstone
	     keeps the whole row, so undo is just clearing the flag. -->
	{#if deletedSessions.length}
		<section>
			<Eyebrow>Recently deleted</Eyebrow>
			<p class="mt-2 text-[14px] text-muted italic">
				Deleted sessions are kept so you can put one back. Restoring a backup will not recover them
				— this is the only way.
			</p>
			<div class="mt-4 overflow-hidden rounded-[14px] border-[0.5px] border-hairline">
				{#each deletedSessions.slice(0, 12) as s (s.id)}
					<div
						class="flex items-center justify-between gap-3 border-b-[0.5px] border-hairline px-4 py-3 last:border-b-0"
					>
						<Mono size="m" tone="ink">{deletedLabel(s)}</Mono>
						<Button
							size="small"
							variant="bordered"
							onclick={() => undelete(s.id)}
							disabled={restoringId === s.id}
						>
							{restoringId === s.id ? 'Restoring…' : 'Restore'}
						</Button>
					</div>
				{/each}
			</div>
		</section>

		<Hairline class="my-7" />
	{/if}

	<!-- ─── Backup ────────────────────────────────────────── -->
	<section>
		<Eyebrow>Backup</Eyebrow>
		<p class="mt-2 text-[14px] text-muted italic">
			Save a snapshot of every tin, session, and photo — or restore from one. Restoring keeps
			whichever copy of a matching item was edited more recently.
		</p>
		<!-- Both actions go through the shared Button, so the backup pair inherits
		     the same size ladder and press physics as every other control. The
		     restore side drives a hidden file input rather than wrapping one in a
		     <label>: a label can't carry `disabled`, so mid-import it stayed
		     clickable and only looked greyed out. -->
		<input
			bind:this={fileInput}
			type="file"
			accept="application/json,.json"
			onchange={importData}
			class="hidden"
		/>
		<div class="mt-4 flex flex-col gap-3">
			<Button size="large" variant="bordered" full onclick={exportData} disabled={exporting}>
				{exporting ? 'Preparing…' : 'Download backup'}
			</Button>
			<Button
				size="large"
				variant="bordered"
				full
				onclick={() => fileInput?.click()}
				disabled={importing}
			>
				{importing ? 'Restoring…' : 'Restore from file'}
			</Button>
		</div>
		{#if importStatus}
			<div
				role="status"
				aria-live="polite"
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
		<p class="mt-2 text-[14px] text-muted italic">A personal log for matcha sessions.</p>
		<div class="mt-3">
			<Mono size="meta" tone="muted">v{__APP_VERSION__}</Mono>
		</div>
		<!-- -ms-3 pulls the button's own padding back so the label still lines up
		     with the column edge; the hit box keeps the full 36pt. -->
		<div class="-ms-3 mt-3">
			<Button size="regular" variant="plain" href="/privacy">Privacy Policy</Button>
		</div>
	</section>
</main>
