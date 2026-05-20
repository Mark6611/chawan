<script lang="ts">
	// Big-mono numeric flanked by hairline ± buttons.
	// Used for powder grams, water grams, water temp °C — the brewing parameters.

	let {
		value = $bindable(0),
		min = 0,
		max = Infinity,
		step = 1,
		digits = 0,
		unit = '',
		ariaLabel
	}: {
		value?: number;
		min?: number;
		max?: number;
		step?: number;
		digits?: number;
		unit?: string;
		ariaLabel?: string;
	} = $props();

	// Round through toFixed → Number to avoid floating drift on 0.1 step values.
	function clamp(n: number): number {
		return Math.max(min, Math.min(max, Number(n.toFixed(digits))));
	}
	function inc() {
		value = clamp(value + step);
	}
	function dec() {
		value = clamp(value - step);
	}

	const formatted = $derived(value.toFixed(digits));
</script>

<div class="flex items-baseline gap-3" aria-label={ariaLabel}>
	<button
		type="button"
		onclick={dec}
		aria-label="Decrease"
		class="border-rule text-muted hover:text-ink grid h-9 w-9 place-items-center rounded-full border font-mono text-[14px] leading-none"
	>−</button>

	<span class="text-ink min-w-[3ch] text-center font-mono text-[28px] font-light tabular-nums"
		>{formatted}</span
	>
	{#if unit}
		<span class="text-muted font-mono text-[11px]">{unit}</span>
	{/if}

	<button
		type="button"
		onclick={inc}
		aria-label="Increase"
		class="border-rule text-muted hover:text-ink grid h-9 w-9 place-items-center rounded-full border font-mono text-[14px] leading-none"
	>+</button>
</div>
