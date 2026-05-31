<script lang="ts">
	// Bottom sheet for sharing a card. Eyebrow + display + live preview +
	// optional Square/Story toggle + two actions (Share… / Save image) —
	// the shipped sheet vocabulary per affordance.md. Preview renders at 1×
	// immediately; export renders at 3× on tap. The card is a file, not a
	// network — Share… hands the PNG to the OS share sheet, Save image
	// downloads it. No upload.

	import { fade, slide } from 'svelte/transition';
	import { drawShareCard, renderShareCard } from '$lib/share/render-canvas';
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

	// Stat cards have no story variant — only session + palate can toggle.
	const canToggle = $derived(!!data && data.kind !== 'stat');
	const effective = $derived<ShareCardData | null>(data ? ({ ...data, format } as ShareCardData) : null);

	// Reset the format to the incoming card's default when a new card opens.
	// Reads `data` only, so toggling `format` later doesn't re-reset it.
	$effect(() => {
		if (data) format = data.format ?? 'square';
	});

	// Draw the 1× preview when open with data + canvas + on format change.
	$effect(() => {
		if (open && effective && previewCanvas) {
			error = null;
			drawShareCard(previewCanvas, effective, 1).catch((e) => {
				error = e instanceof Error ? e.message : 'Could not render the preview.';
			});
		}
	});

	// Preview box keeps the card's aspect: square 236² / story 9:16.
	const previewW = $derived(format === 'story' ? 210 : 236);
	const previewH = $derived(format === 'story' ? 373 : 236);

	function close() {
		open = false;
	}

	async function render(): Promise<Blob | null> {
		if (!effective) return null;
		return renderShareCard(effective, 3);
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

	async function doSave() {
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
			class="bg-paper border-rule relative w-full max-w-md rounded-t-[22px] border-t px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+24px)]"
		>
			<div class="bg-rule mx-auto mb-4 h-1 w-10 rounded-full"></div>

			<div class="flex items-baseline justify-between gap-3">
				<Eyebrow>{eyebrow}</Eyebrow>
				{#if canToggle}
					<div class="flex gap-3">
						<button
							type="button"
							onclick={() => (format = 'square')}
							class="font-mono text-[10.5px] tracking-[0.14em] uppercase {format === 'square'
								? 'text-tea'
								: 'text-muted hover:text-ink'}"
						>
							Square
						</button>
						<button
							type="button"
							onclick={() => (format = 'story')}
							class="font-mono text-[10.5px] tracking-[0.14em] uppercase {format === 'story'
								? 'text-tea'
								: 'text-muted hover:text-ink'}"
						>
							Story
						</button>
					</div>
				{/if}
			</div>
			<div class="mt-1">
				<Display size="m">{heading}</Display>
			</div>

			<div class="mt-5 flex justify-center">
				<canvas
					bind:this={previewCanvas}
					class="border-hairline rounded-[14px] border-[0.5px]"
					style="width: {previewW}px; height: {previewH}px;"
				></canvas>
			</div>

			{#if error}
				<div class="border-danger mt-4 rounded-[14px] border-[0.5px] px-4 py-3">
					<Mono size="meta" tone="ink">{error}</Mono>
				</div>
			{/if}

			<div class="mt-5 space-y-3">
				<PrimaryButton onclick={doShare} disabled={busy}>
					{busy ? 'Preparing…' : 'Share…'}
				</PrimaryButton>
				<PrimaryButton kind="line" onclick={doSave} disabled={busy}>Save image</PrimaryButton>
			</div>
		</div>
	</div>
{/if}
