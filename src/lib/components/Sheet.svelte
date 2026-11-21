<script lang="ts">
	// A bottom sheet for content you read and dismiss. On an unfolded iPhone Duo
	// the same content sits in the pane beside the page instead, so a sheet that is
	// open when the device unfolds closes itself (the caller watches the pane).
	// Focus, Escape and scroll lock come from the helpers ConfirmSheet uses.
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { motion } from '$lib/motion.svelte';
	import { lockScroll, trapFocus } from './modal';

	let {
		open = $bindable(false),
		label,
		children
	}: {
		open?: boolean;
		label: string;
		children: Snippet;
	} = $props();

	let sheetEl = $state<HTMLElement | null>(null);
	let invoker: HTMLElement | null = null;

	$effect(() => {
		if (!open) return;
		invoker = document.activeElement as HTMLElement | null;
		const unlock = lockScroll();
		return () => {
			unlock();
			if (invoker?.isConnected) invoker.focus();
		};
	});

	$effect(() => {
		if (!open || !sheetEl) return;
		return trapFocus(sheetEl, () => (open = false));
	});
</script>

{#if open}
	<div
		class="fixed inset-0 z-[60] bg-black/45"
		transition:fade={motion({ duration: 150 })}
		onclick={() => (open = false)}
		aria-hidden="true"
	></div>
	<div
		class="sheet-host pointer-events-none fixed inset-0 z-[61] flex items-end justify-center pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]"
	>
		<div
			bind:this={sheetEl}
			role="dialog"
			aria-modal="true"
			aria-label={label}
			tabindex="-1"
			class="pointer-events-auto max-h-[80dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[22px] border-t border-rule bg-paper px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+24px)] outline-none"
			transition:fly={motion({ y: 40, duration: 220 })}
		>
			<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-rule"></div>
			{@render children()}
			<button
				type="button"
				onclick={() => (open = false)}
				class="mt-6 w-full rounded-full border-[0.5px] border-rule py-3 font-mono text-[11px] tracking-[0.10em] text-ink uppercase"
			>
				Done
			</button>
		</div>
	</div>
{/if}
