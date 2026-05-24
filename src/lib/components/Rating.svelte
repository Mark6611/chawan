<script lang="ts">
	// Half-point rating dots. Each dot has two clickable halves:
	//   - Left half  → sets value to (i + 0.5)
	//   - Right half → sets value to (i + 1)
	// Tapping the same value again clears the rating (un-rate).
	//
	// Display-only mode (no `interactive` prop) renders the halves as plain
	// spans, keeping the same visual fill rules.

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
		value = value === n ? 0 : n;
	}

	function leftFilled(i: number) {
		return value >= i + 0.5;
	}
	function rightFilled(i: number) {
		return value >= i + 1;
	}
</script>

<div
	class="flex items-center gap-1.5"
	role={interactive ? 'group' : 'img'}
	aria-label={ariaLabel ?? `Rating ${value} of ${max}`}
>
	{#each Array.from({ length: max }) as _, i}
		<div
			class="border-rule flex overflow-hidden rounded-full border-[0.5px]"
			style="width: {size}px; height: {size}px;"
		>
			{#if interactive}
				<button
					type="button"
					aria-label="{i + 0.5} of {max}"
					onclick={() => set(i + 0.5)}
					class="h-full w-1/2 transition-colors {leftFilled(i) ? 'bg-data' : ''}"
				></button>
				<button
					type="button"
					aria-label="{i + 1} of {max}"
					onclick={() => set(i + 1)}
					class="h-full w-1/2 transition-colors {rightFilled(i) ? 'bg-data' : ''}"
				></button>
			{:else}
				<span class="h-full w-1/2 {leftFilled(i) ? 'bg-data' : ''}" aria-hidden="true"></span>
				<span class="h-full w-1/2 {rightFilled(i) ? 'bg-data' : ''}" aria-hidden="true"></span>
			{/if}
		</div>
	{/each}
</div>
