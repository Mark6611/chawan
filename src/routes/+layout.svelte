<script lang="ts">
	// Fonts — self-hosted via Fontsource so the PWA stays offline-friendly.
	// Cormorant Garamond (display): regular + italic, multiple weights.
	import '@fontsource/cormorant-garamond/400.css';
	import '@fontsource/cormorant-garamond/500.css';
	import '@fontsource/cormorant-garamond/600.css';
	import '@fontsource/cormorant-garamond/400-italic.css';
	// EB Garamond (body): regular + italic.
	import '@fontsource/eb-garamond/400.css';
	import '@fontsource/eb-garamond/400-italic.css';
	// IBM Plex Mono (mono): light/regular/medium for the numeric scale.
	import '@fontsource/ibm-plex-mono/300.css';
	import '@fontsource/ibm-plex-mono/400.css';
	import '@fontsource/ibm-plex-mono/500.css';

	import './layout.css';

	import { onMount } from 'svelte';

	type Theme = 'day' | 'night';
	let theme = $state<Theme>('day');

	function apply(t: Theme) {
		document.documentElement.setAttribute('data-theme', t);
	}

	function toggle() {
		theme = theme === 'day' ? 'night' : 'day';
		localStorage.setItem('chawan:theme', theme);
		apply(theme);
	}

	onMount(() => {
		const saved = (localStorage.getItem('chawan:theme') as Theme | null) ?? 'day';
		theme = saved;
		apply(saved);
	});

	let { children } = $props();
</script>

<button
	type="button"
	onclick={toggle}
	class="border-rule text-ink hover:bg-surface fixed top-3 right-3 z-50 grid h-9 w-9 place-items-center rounded-full border bg-transparent transition-colors"
	aria-label="Toggle theme (current: {theme})"
	title="Theme: {theme}"
>
	{#if theme === 'night'}
		<!-- moon -->
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
		</svg>
	{:else}
		<!-- sun -->
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
			/>
		</svg>
	{/if}
</button>

{@render children()}
