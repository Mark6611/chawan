<script lang="ts">
	// 5-dot rating scale, filled with --color-data.
	// Empty dots are hairline-stroked, no fill. Tabular spacing.
	// Pass `interactive` + bind:value for an input control (used on the new-session form).

	let {
		value = $bindable(0),
		max = 5,
		size = 8,
		interactive = false,
		ariaLabel
	}: {
		value?: number;
		max?: number;
		size?: number;
		interactive?: boolean;
		ariaLabel?: string;
	} = $props();

	function set(n: number) {
		if (!interactive) return;
		// Tapping the same value clears the rating (so users can un-rate).
		value = value === n ? 0 : n;
	}
</script>

<div
	class="flex items-center gap-1.5"
	role={interactive ? 'radiogroup' : 'img'}
	aria-label={ariaLabel ?? `Rating ${value} of ${max}`}
>
	{#each Array.from({ length: max }) as _, i}
		{@const filled = i < value}
		{#if interactive}
			<button
				type="button"
				role="radio"
				aria-checked={i + 1 === value}
				aria-label="{i + 1} of {max}"
				onclick={() => set(i + 1)}
				class="rounded-full border-[0.5px] {filled ? 'border-data bg-data' : 'border-rule bg-transparent'}"
				style="width: {size}px; height: {size}px;"
			></button>
		{:else}
			<span
				aria-hidden="true"
				class="rounded-full border-[0.5px] {filled ? 'border-data bg-data' : 'border-rule bg-transparent'}"
				style="width: {size}px; height: {size}px;"
			></span>
		{/if}
	{/each}
</div>
