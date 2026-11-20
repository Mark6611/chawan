<script lang="ts">
	// Bottom action sheet for confirmations. Singleton, mounted once in
	// +layout.svelte, driven by confirm.svelte.ts. The browser's window.confirm
	// gave focus trapping, Escape and scroll lock for free — an in-page sheet
	// has to provide all three itself. (Ported from the coffee sibling, in
	// chawan's vocabulary: paper, hairline, serif.)
	import { afterNavigate } from '$app/navigation';
	import { confirmStore } from '$lib/confirm.svelte';
	import { motion } from '$lib/motion.svelte';
	import { fade, fly } from 'svelte/transition';
	import Button from './Button.svelte';
	import { lockScroll, trapFocus } from './modal';

	const req = $derived(confirmStore.pending);
	let sheetEl = $state<HTMLElement | null>(null);

	// window.confirm could never outlive its page; this sheet can (it lives in
	// the layout, outside the routed content). Back or an edge-swipe while it is
	// up would otherwise leave a destructive dialog — and the scroll lock —
	// floating over the new page. Settling false takes the stranded handler down
	// its cancel path.
	afterNavigate(() => confirmStore.settle(false));

	// The sheet ignores activation for its first beat, like a presenting system
	// alert. A double-tap on the trigger otherwise lands its second tap on
	// whatever mounted under the finger, and the fly-in puts the verb button
	// right where the trigger was.
	function armed(): boolean {
		return !!req && performance.now() - req.openedAt >= 250;
	}
	function onVerb() {
		if (armed()) confirmStore.settle(true);
	}
	function onCancel() {
		if (armed()) confirmStore.settle(false);
	}

	$effect(() => {
		if (!req) return;
		return lockScroll();
	});

	$effect(() => {
		if (!req || !sheetEl) return;
		return trapFocus(sheetEl, () => confirmStore.settle(false));
	});
</script>

{#if req}
	<!-- Above the share sheet (z-60) and the update prompt (z-70). The scrim is a
	     decorative dismiss surface: keyboard users cancel with Escape, and
	     assistive tech interacts with the alertdialog. -->
	<div
		class="fixed inset-0 z-[80] bg-black/45"
		transition:fade={motion({ duration: 150 })}
		onclick={onCancel}
		aria-hidden="true"
	></div>
	<div
		bind:this={sheetEl}
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="confirm-title"
		aria-describedby="confirm-body"
		tabindex="-1"
		class="fixed z-[81] mx-auto max-w-md rounded-[22px] border-[0.5px] border-rule bg-paper p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)] outline-none"
		style="left: calc(12px + env(safe-area-inset-left, 0px)); right: calc(12px + env(safe-area-inset-right, 0px)); bottom: calc(12px + env(safe-area-inset-bottom, 0px))"
		transition:fly={motion({ y: 24, duration: 200 })}
	>
		<h2 id="confirm-title" class="font-display text-[24px] leading-[1.2] text-ink italic">
			{req.title}
		</h2>
		<p id="confirm-body" class="mt-2 text-[14px] leading-[1.5] text-muted">
			{req.body}
		</p>
		<div class="mt-5 flex flex-col gap-2">
			<Button
				size="large"
				variant={req.destructive ? 'destructive' : 'tea'}
				full
				class={req.destructive ? 'border-[0.5px] border-danger/40' : ''}
				onclick={onVerb}>{req.verb}</Button
			>
			<Button size="large" variant="bordered" full onclick={onCancel}>{req.cancelLabel}</Button>
		</div>
	</div>
{/if}
