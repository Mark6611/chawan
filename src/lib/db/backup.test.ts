import { describe, expect, it, vi } from 'vitest';
import { Dexie } from 'dexie';
import { isQuota } from './quota';
import { dataUrlToBlob } from './backup';

// Regression coverage for the quota-detection bug: isQuota() originally gated
// on `err instanceof DOMException`, which is true for the error the BROWSER
// throws but false for the one the app actually receives. Dexie installs a
// global rejectionMapper that rewraps it as a DexieError, so nothing thrown by
// db.*.put() ever matched — a full disk was reported to the user as a corrupt
// backup file, which is the one distinction this function exists to make.
describe('isQuota', () => {
	it('matches the native DOMException the browser throws', () => {
		expect(isQuota(new DOMException('quota', 'QuotaExceededError'))).toBe(true);
	});

	it('matches the Firefox spelling', () => {
		expect(isQuota(new DOMException('quota', 'NS_ERROR_DOM_QUOTA_REACHED'))).toBe(true);
	});

	it('matches what Dexie actually hands us after remapping', () => {
		// rejectionMapper is internal to Dexie — real at runtime, absent from the
		// published types. Reaching for it deliberately: the whole point is to
		// assert against the error the app really receives, not a stand-in.
		const mapper = (Dexie.Promise as unknown as { rejectionMapper: (e: unknown) => unknown })
			.rejectionMapper;
		const mapped = mapper(new DOMException('quota', 'QuotaExceededError'));

		// Guard the premise: if a Dexie upgrade ever stops remapping, this
		// assertion fails loudly rather than the test passing for the wrong
		// reason.
		expect(mapped).not.toBeInstanceOf(DOMException);
		expect(isQuota(mapped)).toBe(true);
	});

	it('does not match unrelated failures', () => {
		expect(isQuota(new Error('network down'))).toBe(false);
		expect(isQuota(new DOMException('nope', 'DataCloneError'))).toBe(false);
		expect(isQuota(null)).toBe(false);
		expect(isQuota(undefined)).toBe(false);
		expect(isQuota('QuotaExceededError')).toBe(false);
	});
});

// Regression coverage for the restore-time SSRF/beacon: dataUrlToBlob used to
// be `fetch(dataUrl).blob()`, and fetch() resolves ANY scheme. A backup file
// is untrusted input — hand-editable, and shareable between people — so a
// crafted "dataUrl": "https://attacker.example/beacon?d=..." turned a restore
// into a real outbound request. That is the whole proposition of a local-only
// app, and chawan ships no CSP to catch it. These pin the scheme, not the type.
describe('dataUrlToBlob', () => {
	const jpeg = `data:image/jpeg;base64,${btoa('\xff\xd8\xff\xe0 fake jpeg bytes')}`;

	it('decodes a base64 image data URL to bytes, without any network call', async () => {
		const spy = vi.spyOn(globalThis, 'fetch');
		const blob = dataUrlToBlob(jpeg);
		expect(blob.type).toBe('image/jpeg');
		// Compare BYTES, not text: a JPEG starts 0xFF 0xD8, which is not valid
		// UTF-8, so blob.text() would mangle exactly the bytes that matter.
		const bytes = new Uint8Array(await blob.arrayBuffer());
		expect([...bytes.slice(0, 4)]).toEqual([0xff, 0xd8, 0xff, 0xe0]);
		expect(bytes.length).toBe(20);
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	// The exact payload the old implementation would have fetched.
	it('refuses an http(s) URL instead of requesting it', () => {
		const spy = vi.spyOn(globalThis, 'fetch');
		expect(() => dataUrlToBlob('https://attacker.example/beacon?d=leak')).toThrow(
			/not a base64 image data URL/
		);
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	it.each([
		['file://', 'file:///etc/passwd'],
		['blob:', 'blob:https://example.com/abc-123'],
		['non-image data:', 'data:text/html;base64,PHNjcmlwdD4='],
		['svg (scriptable)', 'data:image/svg+xml;base64,PHN2Zy8+'],
		['url-encoded, not base64', 'data:image/png,%3Cscript%3E'],
		['empty', '']
	])('refuses %s', (_label, value) => {
		expect(() => dataUrlToBlob(value)).toThrow();
	});

	it('refuses a photo over the size cap before allocating it', () => {
		const huge = `data:image/png;base64,${'A'.repeat(12 * 1024 * 1024)}`;
		expect(() => dataUrlToBlob(huge)).toThrow(/size cap/);
	});

	it('refuses malformed base64', () => {
		expect(() => dataUrlToBlob('data:image/jpeg;base64,not valid base64!!')).toThrow();
	});
});
