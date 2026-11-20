// Promise-based confirm store: call `confirmSheet({...})` from any handler and
// await the boolean, exactly like window.confirm — so call sites keep their
// shape. A singleton <ConfirmSheet /> in +layout.svelte renders the pending
// request.
//
// Why not window.confirm: inside the iOS shell it presents as a system alert
// titled with the web view's origin, in the system font, over an app that is
// otherwise all serif and hairlines. (Ported from the coffee sibling.)

export interface ConfirmRequest {
	title: string;
	body: string;
	/** The action's own verb ("Delete session", "Restore") — never "OK". */
	verb: string;
	destructive?: boolean;
	cancelLabel?: string;
}

interface Pending extends ConfirmRequest {
	resolve: (ok: boolean) => void;
	/** The control that opened the sheet — focus returns here on settle. */
	invoker: HTMLElement | null;
	/** Present timestamp; the sheet ignores activation in its first ~250ms so a
	 *  double-tap on the trigger can't fall through and confirm or self-cancel. */
	openedAt: number;
}

let pending = $state<Pending | null>(null);

export const confirmStore = {
	get pending() {
		return pending;
	},
	settle(ok: boolean) {
		if (!pending) return;
		const { resolve, invoker } = pending;
		pending = null;
		resolve(ok);
		// window.confirm restored focus to the invoker for free; the sheet has to
		// do it itself. Skip when the settle came from navigation and the
		// invoking page is gone.
		if (invoker?.isConnected) invoker.focus();
	}
};

export function confirmSheet(req: ConfirmRequest): Promise<boolean> {
	const invoker = document.activeElement as HTMLElement | null;
	// An in-page sheet renders BEHIND the iOS keyboard (unlike a system alert),
	// so drop the keyboard before presenting.
	invoker?.blur?.();
	// A superseded request must settle, not strand: its awaiting handler takes
	// the cancel path and restores any guard flags it set before the await.
	pending?.resolve(false);
	return new Promise<boolean>((resolve) => {
		pending = {
			destructive: true,
			cancelLabel: 'Cancel',
			...req,
			resolve,
			invoker,
			openedAt: performance.now()
		};
	});
}
