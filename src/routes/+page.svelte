<script lang="ts">
	// Session 1 placeholder home. Exercises the visual vocabulary
	// (eyebrow / italic display / mono numeric / hairline / tea CTA / chawan glyph)
	// so we can verify tokens, fonts, and theming. Replaced by the real Home in Session 4.

	const today = new Date().toLocaleDateString('en-US', {
		weekday: 'short',
		day: 'numeric',
		month: 'short'
	});
</script>

<main class="mx-auto max-w-md px-6 py-12">
	<div class="eyebrow">{today}</div>

	<h1 class="text-ink mt-2 font-display text-[42px] italic leading-[1.05] tracking-[-0.015em]">
		Today
	</h1>

	<div class="bg-hairline my-7 h-px"></div>

	<div>
		<div class="eyebrow">Bowls this week</div>
		<div class="mt-2 flex items-baseline gap-2">
			<span class="text-data font-mono text-[42px] font-light tabular-nums">0</span>
			<span class="text-muted font-mono text-[11px]">bowls</span>
		</div>
	</div>

	<div class="bg-hairline my-7 h-px"></div>

	<button
		type="button"
		class="bg-tea text-on-tea w-full rounded-full px-5 py-4 font-mono text-[11.5px] font-medium tracking-[0.10em] uppercase"
	>
		Begin a session
	</button>

	<div class="mt-12 flex justify-center">
		<svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
			<circle cx="24" cy="24" r="22" fill="none" stroke="var(--color-hairline)" stroke-width="0.8" />
			<circle cx="24" cy="24" r="16" fill="none" stroke="var(--color-hairline)" stroke-width="0.8" />
			<circle cx="24" cy="24" r="9" fill="var(--color-data)" opacity="0.85" />
		</svg>
	</div>

	<p class="text-muted mt-6 text-center font-mono text-[10px] tracking-[0.16em] uppercase">
		Chawan · v0
	</p>
</main>
