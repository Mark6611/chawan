// Device-level preferences — theme and chawan-glyph visibility.
// Lives outside the repository because it's per-device, not synced data.
// Shared between +layout.svelte and /settings so toggling either stays
// in sync.
//
// State is read synchronously at module instantiation so the initial
// render matches localStorage. The init() method is a safety re-read
// for cases where localStorage was unavailable at module load (SSR).

type Theme = 'day' | 'night';

const THEME_KEY = 'chawan:theme';
const HIDE_GLYPH_KEY = 'chawan:no-glyph';

function readInitialTheme(): Theme {
	if (typeof localStorage === 'undefined') return 'day';
	return localStorage.getItem(THEME_KEY) === 'night' ? 'night' : 'day';
}

function readInitialHideGlyph(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(HIDE_GLYPH_KEY) === 'true';
}

class Preferences {
	theme = $state<Theme>(readInitialTheme());
	hideChawan = $state(readInitialHideGlyph());

	/** Safety re-read after hydration (SSR may have given defaults). */
	init() {
		if (typeof localStorage === 'undefined') return;
		const t = localStorage.getItem(THEME_KEY);
		this.theme = t === 'night' ? 'night' : 'day';
		this.hideChawan = localStorage.getItem(HIDE_GLYPH_KEY) === 'true';
		this.applyTheme();
	}

	setTheme(t: Theme) {
		// Brief "theming" class on <html> arms a cross-fade transition on
		// every paint-affecting property (background, color, border, fill,
		// stroke) so the data-theme attribute flip doesn't snap. CSS rule
		// lives in layout.css; window is 350ms.
		if (typeof document !== 'undefined') {
			document.documentElement.classList.add('theming');
			setTimeout(() => {
				document.documentElement.classList.remove('theming');
			}, 350);
		}
		this.theme = t;
		this.applyTheme();
		try {
			localStorage.setItem(THEME_KEY, t);
		} catch {
			// Storage may be full or disabled — ignore.
		}
	}

	toggleTheme() {
		this.setTheme(this.theme === 'day' ? 'night' : 'day');
	}

	setHideChawan(v: boolean) {
		this.hideChawan = v;
		try {
			localStorage.setItem(HIDE_GLYPH_KEY, String(v));
		} catch {
			// no-op
		}
	}

	private applyTheme() {
		if (typeof document === 'undefined') return;
		document.documentElement.setAttribute('data-theme', this.theme);
	}
}

export const preferences = new Preferences();
