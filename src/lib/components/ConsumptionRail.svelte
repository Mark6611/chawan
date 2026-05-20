<script lang="ts">
	// Horizontal rail showing tin consumption.
	// 2px-tall track of --color-hairline with a fill of --color-data.
	// Optional per-session tick marks above the rail.
	//
	// `percent` is 0–1 (clamped). `ticks` are normalized 0–1 positions of
	// each individual session along the timeline.

	let {
		percent,
		ticks
	}: {
		percent: number;
		ticks?: number[];
	} = $props();

	const fill = $derived(Math.max(0, Math.min(1, percent)));
</script>

<div class="relative">
	{#if ticks && ticks.length}
		<div class="relative mb-1 h-2">
			{#each ticks as t, i (i)}
				<span
					class="bg-data absolute top-0 h-2 w-px"
					style="left: {Math.max(0, Math.min(1, t)) * 100}%"
				></span>
			{/each}
		</div>
	{/if}
	<div class="bg-hairline relative h-[2px] w-full">
		<div
			class="bg-data absolute top-0 left-0 h-[2px] transition-[width] duration-300"
			style="width: {fill * 100}%"
		></div>
	</div>
</div>
