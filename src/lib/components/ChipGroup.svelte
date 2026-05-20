<script lang="ts">
	// Pill-shaped chips for region + milk pickers + cultivar suggestions.
	// `multi=false`: single-select, value is a string.
	// `multi=true`: multi-select, value is a string[].
	//
	// Selected: tea border, tea text, tea-wash background.
	// Idle: hairline border, muted text.

	type Option = { value: string; label: string };

	let {
		options,
		value = $bindable<string | string[]>(''),
		multi = false
	}: {
		options: Option[];
		value: string | string[];
		multi?: boolean;
	} = $props();

	function isSelected(v: string): boolean {
		if (multi && Array.isArray(value)) return value.includes(v);
		return value === v;
	}

	function toggle(v: string) {
		if (multi) {
			const arr = Array.isArray(value) ? value : [];
			value = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
		} else {
			// Tapping the selected chip clears the selection.
			value = value === v ? '' : v;
		}
	}
</script>

<div class="flex flex-wrap gap-2" role={multi ? 'group' : 'radiogroup'}>
	{#each options as opt (opt.value)}
		{@const sel = isSelected(opt.value)}
		<button
			type="button"
			role={multi ? undefined : 'radio'}
			aria-checked={multi ? undefined : sel}
			aria-pressed={multi ? sel : undefined}
			onclick={() => toggle(opt.value)}
			class="rounded-full border-[0.5px] px-2.5 py-1 font-mono text-[11px]
				{sel ? 'border-tea bg-tea-wash text-tea' : 'border-rule text-muted hover:text-ink'}"
		>
			{opt.label}
		</button>
	{/each}
</div>
