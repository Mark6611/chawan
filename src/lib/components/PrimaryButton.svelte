<script lang="ts">
	// Full-width pill button. Three kinds:
	//   tea   — filled accent; the primary CTA on a screen
	//   line  — hairline outline; the secondary action
	//   ghost — no border, ink text; the tertiary or "back" affordance
	//
	// Pass `href` to render a navigation anchor styled identically. Avoids
	// the invalid `<a><button>` nesting when the CTA is really a link.

	import type { Snippet } from 'svelte';

	type Kind = 'tea' | 'line' | 'ghost';

	let {
		kind = 'tea',
		type = 'button',
		href,
		onclick,
		disabled = false,
		ariaLabel,
		children
	}: {
		kind?: Kind;
		type?: 'button' | 'submit' | 'reset';
		href?: string;
		onclick?: () => void;
		disabled?: boolean;
		ariaLabel?: string;
		children: Snippet;
	} = $props();

	// The filled CTA gets the liquid-glass sheen; outline/ghost stay flat.
	const kindClass: Record<Kind, string> = {
		tea: 'bg-tea text-on-tea glass-cta',
		line: 'border-rule text-ink border bg-transparent',
		ghost: 'text-ink bg-transparent'
	};

	const baseClass =
		'press block w-full rounded-full px-5 py-4 text-center font-mono text-[11.5px] font-medium ' +
		'tracking-[0.10em] uppercase disabled:pointer-events-none disabled:opacity-40';
</script>

{#if href && !disabled}
	<a {href} aria-label={ariaLabel} class="{baseClass} {kindClass[kind]}">
		{@render children()}
	</a>
{:else}
	<button {type} {onclick} {disabled} aria-label={ariaLabel} class="{baseClass} {kindClass[kind]}">
		{@render children()}
	</button>
{/if}
