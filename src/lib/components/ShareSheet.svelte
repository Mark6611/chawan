<script lang="ts">
	// Bottom sheet for sharing a card. Eyebrow + display + Night/Day +
	// (Square/Story) toggles + live preview + two actions — the shipped
	// sheet vocabulary per affordance.md. Preview renders at 1×; export at
	// 3× on tap.
	//
	// Share… → the OS share sheet (AirDrop, Messages, and on iOS "Save
	// Image" → Photos). Download → a direct file download (Files on iOS,
	// Downloads on desktop). The card is a file, not a network — no upload.

	import { fade, slide } from 'svelte/transition';
	import { drawShareCard, renderShareCard, type CardTheme } from '$lib/share/render-canvas';
	import { shareOrDownload, type ShareCardData, type ShareFormat } from '$lib/share/share-card';

	import Eyebrow from './Eyebrow.svelte';
	import Display from './Display.svelte';
	import Mono from './Mono.svelte';
	import PrimaryButton from './PrimaryButton.svelte';

	let {
		open = $bindable(false),
		data,
		filename,
		eyebrow = 'Share this bowl',
		heading = 'A card to keep'
	}: {
		open?: boolean;
		data: ShareCardData | null;
		filename: string;
		eyebrow?: string;
		heading?: string;
	} = $props();

	let previewCanvas = $state<HTMLCanvasElement>();
	let busy = $state(false);
	let error = $state<string | null>(null);
	let format = $state<ShareFormat>('square');
	let theme = $state<CardTheme>('night');

	// Stat cards have no story variant — only session + palate can toggle format.
	const canToggleFormat = $derived(!!data && data.kind !== 'stat');
	const effective = $derived<ShareCardData | null>(
		data ? ({ ...data, format } as ShareCardData) : null
	);

	// Reset format to the incoming card's default when a new card opens.
	// (Reads `data` only, so toggling `format` later doesn't self-reset.)
	$effect(() => {
		if (data) format = data.format ?? 'square';
	});

	// Draw the 1× preview on open / format / theme change.
	$effect(() => {
		if (open && effective && previewCanvas) {
			error = null;
			drawShareCard(previewCanvas, effective, 1, theme).catch((e) => {
				error = e instanceof Error ? e.message : 'Could not render the preview.';
			});
		}
	});

	const previewW = $derived(format === 'story' ? 210 : 236);
	const previewH = $derived(format === 'story' ? 373 : 236);

	function close() {
		open = false;
	}

	async function render(): Promise<Blob | null> {
		if (!effective) return null;
		return renderShareCard(effective, 3, theme);
	}

	async function doShare() {
		if (!effective || busy) return;
		busy = true;
		error = null;
		try {
			const blob = await render();
			if (blob) await shareOrDownload(blob, filename);
			open = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not create the image.';
		} finally {
			busy = false;
		}
	}

	async function doDownload() {
		if (!effective || busy) return;
		busy = true;
		error = null;
		try {
			const blob = await render();
			if (blob) {
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = filename;
				a.click();
				setTimeout(() => URL.revokeObjectURL(url), 1000);
			}
			open = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save the image.';
		} finally {
			busy = false;
		}
	}

	// Small inline toggle: [a · b], active option in tea.
	const toggleClass = (active: boolean) =>
		`font-mono text-[10.5px] tracking-[0.14em] uppercase ${active ? 'text-tea' : 'text-muted hover:text-ink'}`;
</script>

{#if open && data}
	<div class="fixed inset-0 z-[60] flex items-end justify-center">
		<!-- scrim -->
		<button
			type="button"
			aria-label="Close"
			onclick={close}
			transition:fade={{ duration: 150 }}
			class="absolute inset-0 bg-black/45"
		></button>

		<!-- sheet -->
		<div
			transition:slide={{ duration: 220 }}
			class="relative w-full max-w-md rounded-t-[22px] border-t border-rule bg-paper px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+24px)]"
		>
			<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-rule"></div>

			<Eyebrow>{eyebrow}</Eyebrow>
			<div class="mt-1">
				<Display size="m">{heading}</Display>
			</div>

			<!-- Toggles: theme always; format for session + palate -->
			<div class="mt-4 flex items-center gap-5">
				<div class="flex gap-3">
					<button
						type="button"
						onclick={() => (theme = 'night')}
						class={toggleClass(theme === 'night')}
					>
						Night
					</button>
					<button
						type="button"
						onclick={() => (theme = 'day')}
						class={toggleClass(theme === 'day')}
					>
						Day
					</button>
				</div>
				{#if canToggleFormat}
					<span class="h-3 w-px bg-rule"></span>
					<div class="flex gap-3">
						<button
							type="button"
							onclick={() => (format = 'square')}
							class={toggleClass(format === 'square')}
						>
							Square
						</button>
						<button
							type="button"
							onclick={() => (format = 'story')}
							class={toggleClass(format === 'story')}
						>
							Story
						</button>
					</div>
				{/if}
			</div>

			<div class="mt-5 flex justify-center">
				<canvas
					bind:this={previewCanvas}
					class="rounded-[14px] border-[0.5px] border-hairline"
					style="width: {previewW}px; height: {previewH}px;"
				></canvas>
			</div>

			{#if error}
				<div class="mt-4 rounded-[14px] border-[0.5px] border-danger px-4 py-3">
					<Mono size="meta" tone="ink">{error}</Mono>
				</div>
			{/if}

			<div class="mt-5 space-y-3">
				<PrimaryButton onclick={doShare} disabled={busy}>
					{busy ? 'Preparing…' : 'Share…'}
				</PrimaryButton>
				<PrimaryButton kind="line" onclick={doDownload} disabled={busy}>Download</PrimaryButton>
			</div>
		</div>
	</div>
{/if}
