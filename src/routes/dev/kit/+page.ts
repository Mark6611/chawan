import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// This exhibit is a development aid, but adapter-static's SPA fallback serves
// any unknown path from the same shell — so without this guard the route was
// reachable by URL inside the shipped App Store binary and on the public site.
// (Mirrors the coffee sibling's src/routes/dev/buttons/+page.ts.)
export function load() {
	if (!dev) error(404, 'Not found');
}
