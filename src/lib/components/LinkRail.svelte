<script lang="ts">
	// Bottom navigation — a typographic tab bar. Phase-0 choice over an icon tab
	// bar, and it stays that way: the iOS 27 kit's tab-bar STRUCTURE is what's
	// borrowed (floating glass bar, capsule selection, 44pt targets), not its
	// SF Symbols, which would fight Chawan's all-type voice.
	//
	// Two things the old rail got wrong that the kit fixes:
	//   · The bar was `bg-paper/95 backdrop-blur` hand-rolled — now the shared
	//     .glass material at the large scale, like every other floating surface.
	//   · Active state was ink-vs-muted, i.e. colour alone. The selected tab now
	//     also carries a tinted capsule, so the state survives a colour-blind
	//     viewer and a greyscale screenshot.
	//
	// The active label stays ink rather than tea: tea-on-tinted-capsule measured
	// 3.8:1 in night, under AA for 10px type. The capsule already carries the
	// state on its own, so the label is free to take the legible colour.
	//
	// The bar floats inset from the edges rather than spanning them, which is
	// what lets the material read as glass — a full-bleed bar has nothing beside
	// it to refract against.

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
	class="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
	aria-label="Primary"
>
	<div class="pointer-events-auto mx-auto max-w-md px-4">
		<div class="glass glass-lg flex items-center justify-between gap-0.5 rounded-full p-1">
			{#each links as link (link.href)}
				{@const active = isActive(link.href)}
				<a
					href={link.href}
					class="press-sm flex h-11 flex-1 items-center justify-center rounded-full px-1
						font-mono text-[10px] tracking-[0.08em] uppercase
						{active ? 'glass-tinted glass-sm text-ink' : 'text-ink-70 hover:text-ink'}"
					aria-current={active ? 'page' : undefined}
				>
					{link.label}
				</a>
			{/each}
		</div>
	</div>
</nav>
