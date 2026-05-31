<script lang="ts">
	// Bottom sheet for sharing a card. Eyebrow + display + live preview +
	// two actions (Share… / Save image) — the shipped sheet vocabulary per
	// affordance.md. Preview renders at 1× immediately; export renders at 3×
	// on tap. The card is a file, not a network — Share… hands the PNG to
	// the OS share sheet, Save image downloads it. No upload.

	import { fade, slide } from 'svelte/transition';
	import { drawShareCard, renderShareCard } from '$lib/share/render-canvas';
	import { shareOrDownload, type ShareCardData } from '$lib/share/share-card';

	import Eyebrow from './Eyebrow.svelte';
	import Display from './Display.svelte';
	import Mono from './Mono.svelte';
	import PrimaryButton from './PrimaryButton.svelte';

	let {
		open = $bindable(false),
		data,
		filename
	}: {
		open?: boolean;
		data: ShareCardData | null;
		filename: string;
	} = $props();

	let previewCanvas = $state<HTMLCanvasElement>();
	let busy = $state(false);
	let error = $state<string | null>(null);

	// Draw the 1× preview whenever the sheet is open with data + a canvas.
	$effect(() => {
		if (open && data && previewCanvas) {
			error = null;
			drawShareCard(previewCanvas, data, 1).catch((e) => {
				error = e instanceof Error ? e.message : 'Could not render the preview.';
			});
		}
	});

	function close() {
		open = false;
	}

	async function doShare() {
		if (!data || busy) return;
		busy = true;
		error = null;
		try {
			const blob = await renderShareCard(data, 3);
			await shareOrDownload(blob, filename);
			open = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not create the image.';
		} finally {
			busy = false;
		}
	}

	async function doSave() {
		if (!data || busy) return;
		busy = true;
		error = null;
		try {
			const blob = await renderShareCard(data, 3);
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
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

			<Eyebrow>Share this bowl</Eyebrow>
			<div class="mt-1">
				<Display size="m">A card to keep</Display>
			</div>

			<div class="mt-5 flex justify-center">
				<canvas
					bind:this={previewCanvas}
					class="border-hairline rounded-[14px] border-[0.5px]"
					style="width: 236px; height: 236px;"
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
