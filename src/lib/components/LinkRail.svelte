<script lang="ts">
	// Bottom navigation — typographic mono link rail. Phase-0 choice over an
	// icon tab bar. Matches the coffee app's pattern (in-family).
	//
	// Active route renders ink; idle routes render muted. No icons.

	import { page } from '$app/state';

	const links = [
		{ href: '/', label: 'Today' },
		{ href: '/sessions', label: 'Sessions' },
		{ href: '/tins', label: 'Tins' },
		{ href: '/catalog', label: 'Catalog' },
		{ href: '/settings', label: 'Settings' }
	];

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		if (href === '/') return path === '/';
		return path === href || path.startsWith(href + '/');
	}
</script>

<nav
	class="border-rule bg-paper/95 fixed right-0 bottom-0 left-0 border-t backdrop-blur pb-[env(safe-area-inset-bottom)]"
	aria-label="Primary"
>
	<div class="mx-auto flex max-w-md justify-between px-6 py-3">
		{#each links as link (link.href)}
			{@const active = isActive(link.href)}
			<a
				href={link.href}
				class="font-mono text-[11px] tracking-[0.10em] uppercase
					{active ? 'text-ink' : 'text-muted hover:text-ink'}"
				aria-current={active ? 'page' : undefined}
			>
				{link.label}
			</a>
		{/each}
	</div>
</nav>
