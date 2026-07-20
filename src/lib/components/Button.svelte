<script lang="ts">
	import type { Snippet } from 'svelte';

	// Button system modelled on the Apple iOS 27 UI Kit, which organises every
	// button as a size crossed with a style rather than as a one-off recipe.
	// Sizes follow the kit's Large/Medium/Regular/Small ladder; variants come
	// from its Bordered Prominent / Bordered / Default / Destructive / Glass /
	// Glass Prominent set, renamed to what they mean here.
	//
	// Deliberately NOT a copy of the coffee sibling's button: the structure is
	// shared (so the family reads as one hand), but the voice is Chawan's —
	// mono, uppercase, wide tracking, and a capsule at every size.
	//
	// Renders an <a> when `href` is set, a <button> otherwise, so a link that
	// looks like a button doesn't need the class list duplicated.

	type Size = 'large' | 'medium' | 'regular' | 'small';
	type Variant = 'tea' | 'glass' | 'glassTinted' | 'bordered' | 'plain' | 'destructive';

	let {
		size = 'regular',
		variant = 'tea',
		href,
		type = 'button',
		disabled = false,
		full = false,
		iconOnly = false,
		label,
		title,
		onclick,
		class: cls = '',
		children,
		...rest
	}: {
		size?: Size;
		variant?: Variant;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		/** Stretch to the container width (form CTAs, empty-state actions). */
		full?: boolean;
		/** Square footprint — renders a circle instead of a capsule. */
		iconOnly?: boolean;
		/** Accessible name; required when iconOnly, since there's no text. */
		label?: string;
		title?: string;
		onclick?: (e: MouseEvent) => void;
		class?: string;
		children: Snippet;
		[key: string]: unknown;
	} = $props();

	// Heights track the kit's ladder (Large 50 / Medium 44 / Regular 36 /
	// Small 30), nudged to Chawan's rhythm. Mono type runs small, so the text
	// sizes sit below the coffee sibling's at the same box height.
	const SIZES: Record<Size, { box: string; text: string; pad: string; gap: string }> = {
		large: { box: 'h-[52px]', text: 'text-[11.5px]', pad: 'px-5', gap: 'gap-2.5' },
		medium: { box: 'h-11', text: 'text-[11px]', pad: 'px-4', gap: 'gap-2' },
		regular: { box: 'h-9', text: 'text-[10.5px]', pad: 'px-3.5', gap: 'gap-1.5' },
		small: { box: 'h-7', text: 'text-[10px]', pad: 'px-3', gap: 'gap-1.5' }
	};

	// The material scales with the control (see .glass-lg/md/sm).
	const GLASS_SCALE: Record<Size, string> = {
		large: 'glass-lg',
		medium: 'glass-md',
		regular: 'glass-md',
		small: 'glass-sm'
	};

	const VARIANTS: Record<Variant, string> = {
		// Filled accent — the kit's Bordered Prominent. One per screen.
		tea: 'glass-cta bg-tea text-on-tea',
		// Neutral Liquid Glass over whatever it floats on.
		glass: 'glass text-ink hover:brightness-[0.97]',
		// Accent-tinted glass — secondary emphasis without a second filled CTA.
		glassTinted: 'glass glass-tinted text-tea hover:brightness-[0.97]',
		// Hairline outline on the page surface — the kit's Bordered.
		bordered: 'border-[0.5px] border-rule text-ink hover:bg-surface',
		// Text-only; still gets press physics and a hit box.
		plain: 'text-ink hover:bg-surface',
		// Red label, no outline — the kit tints destructive labels rather than
		// outlining them; an outlined pill reads far heavier than the quiet row
		// action these usually are.
		destructive: 'text-danger hover:bg-danger/10'
	};

	const s = $derived(SIZES[size]);
	const shape = $derived(
		iconOnly ? `${s.box} aspect-square rounded-full` : `${s.box} rounded-full ${s.pad}`
	);
	const glassScale = $derived(
		variant === 'glass' || variant === 'glassTinted' ? GLASS_SCALE[size] : ''
	);
	// Small controls read better with the deeper compress (.press-sm).
	const physics = $derived(size === 'small' || iconOnly ? 'press-sm' : 'press');

	const classes = $derived(
		[
			physics,
			'inline-flex shrink-0 items-center justify-center font-mono font-medium tracking-[0.10em]',
			'whitespace-nowrap uppercase disabled:pointer-events-none disabled:opacity-40',
			s.text,
			s.gap,
			shape,
			VARIANTS[variant],
			glassScale,
			full ? 'w-full' : '',
			cls
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

{#if href && !disabled}
	<a {href} class={classes} aria-label={label} {title} {onclick} {...rest}>{@render children()}</a>
{:else}
	<button {type} {disabled} class={classes} aria-label={label} {title} {onclick} {...rest}
		>{@render children()}</button
	>
{/if}
