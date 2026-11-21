// Whether the two-pane layout is showing right now: an iPhone Duo, unfolded.
//
// CSS does the layout (layout.css, `.split` and `.duo-flow`) and follows every
// frame of a fold on its own. This flag exists only for the few places where
// BEHAVIOUR changes with the pane: a list row that fills the pane beside it
// instead of navigating, and the catalog showing chart and list together.
//
// Same two conditions as the CSS, and the same floor — keep them in step:
//   · html[data-foldable]  (the native hinge plugin, see $lib/hinge)
//   · min-width: 860px     (SPLIT_MIN in scripts/verify-duo-layout.mjs)
export const SPLIT_MIN_WIDTH = 860;
const QUERY = `(min-width: ${SPLIT_MIN_WIDTH}px)`;

let split = $state(false);

function compute(): boolean {
	if (typeof document === 'undefined' || typeof matchMedia === 'undefined') return false;
	return 'foldable' in document.documentElement.dataset && matchMedia(QUERY).matches;
}

export const duo = {
	/** True while a reference pane is on screen beside the page. */
	get split() {
		return split;
	},
	/** Re-read both conditions. Call after the hinge flag is set. */
	refresh() {
		split = compute();
	},
	/** Start following the window width. Returns the undo. */
	init(): () => void {
		split = compute();
		if (typeof matchMedia === 'undefined') return () => {};
		const mql = matchMedia(QUERY);
		const on = () => (split = compute());
		mql.addEventListener('change', on);
		return () => mql.removeEventListener('change', on);
	}
};
