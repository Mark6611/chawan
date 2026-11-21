// Thin wrappers over the app-local native plugins. On the web every one of these
// is a no-op, so callers never branch on the platform themselves.

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { parseHingeState, type HingeState } from './hinge';

export const isNative = Capacitor.isNativePlatform();

interface HingeBridge {
	getState(): Promise<{ state: string }>;
	addListener(event: 'change', cb: (e: { state: string }) => void): Promise<PluginListenerHandle>;
}
const Hinge = registerPlugin<HingeBridge>('Hinge');

/** Follow the iPhone Duo's hinge. Devices without a hinge only ever report 'none';
 *  on the web this never calls back at all. */
export async function watchHinge(onChange: (state: HingeState) => void): Promise<void> {
	if (!isNative) return;
	try {
		// Subscribe first, then read the current state — and drop that read if a
		// change event already landed while it was in flight, or a stale state could
		// overwrite a newer one mid-fold.
		let events = 0;
		await Hinge.addListener('change', (e) => {
			events++;
			onChange(parseHingeState(e.state));
		});
		const before = events;
		const { state } = await Hinge.getState();
		if (events === before) onChange(parseHingeState(state));
	} catch {
		/* native shell without the plugin: width-only layout, as before */
	}
}
