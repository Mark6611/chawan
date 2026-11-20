import { prefersReducedMotion } from 'svelte/motion';

// Svelte drives `transition:`/`in:`/`out:` through the Web Animations API
// (element.animate()), NOT through CSS transitions — so a
// `@media (prefers-reduced-motion: reduce)` block in layout.css cannot reach
// them. Every JS-driven transition has to consult the setting itself.
//
// Exported as a FUNCTION, and this file is .svelte.ts, deliberately: reading
// `prefersReducedMotion.current` into a module-level const would snapshot the
// value once at import time and never update when the user changes it.
// (Ported from the coffee sibling's src/lib/motion.svelte.ts.)
export const rm = () => prefersReducedMotion.current;

/** Motion params collapsed to nothing when the user asks for reduced motion. */
export function motion<T extends Record<string, number>>(params: T): T | { duration: 0 } {
	return rm() ? { duration: 0 } : params;
}
