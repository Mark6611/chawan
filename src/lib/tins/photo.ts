// Client-side photo downscale for tin photos. A phone camera shot is
// 3–12 MB; stored raw it bloats IndexedDB fast. Resize to a sane max
// edge and re-encode as JPEG before persisting — a tin photo is a
// reference image, not an archival print.
//
// Browser-only (canvas + createImageBitmap). Not unit-tested — no DOM
// in vitest's node environment; exercised via the form.

const MAX_EDGE = 1280;
const QUALITY = 0.82;

export async function downscalePhoto(file: Blob): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	try {
		const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
		const w = Math.round(bitmap.width * scale);
		const h = Math.round(bitmap.height * scale);

		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('2D canvas context unavailable.');
		ctx.drawImage(bitmap, 0, 0, w, h);

		return await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null.'))),
				'image/jpeg',
				QUALITY
			);
		});
	} finally {
		bitmap.close();
	}
}
