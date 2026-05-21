#!/usr/bin/env node
// Generate PNG icons from static/icon.svg for the PWA manifest.
//
// Optional — iOS 17+ accepts SVG apple-touch-icon and Chrome accepts SVG
// in the manifest. PNGs improve install affordance on older Safari and
// give Android a sharper home-screen icon.
//
// Usage:
//   npm install -D sharp
//   node scripts/icons.mjs
//
// Outputs static/icon-180.png, icon-192.png, icon-512.png.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let sharp;
try {
	sharp = (await import('sharp')).default;
} catch {
	console.error('sharp is not installed. Run: npm install -D sharp');
	process.exit(1);
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, 'static', 'icon.svg');

if (!existsSync(src)) {
	console.error(`Source not found: ${src}`);
	process.exit(1);
}

const svg = readFileSync(src);
const sizes = [180, 192, 512];

await Promise.all(
	sizes.map((size) =>
		sharp(svg, { density: 384 })
			.resize(size, size)
			.png({ compressionLevel: 9 })
			.toFile(join(root, 'static', `icon-${size}.png`))
			.then(() => console.log(`✓ icon-${size}.png`))
	)
);

console.log('\nDone. Update vite.config.ts manifest.icons to reference the PNGs:');
console.log("  { src: 'icon-180.png', sizes: '180x180', type: 'image/png' },");
console.log("  { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },");
console.log("  { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }");
