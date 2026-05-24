import { describe, expect, it } from 'vitest';
import { snapshotForTin } from './snapshot';
import type { CatalogEntry } from './types';

const eiju: CatalogEntry = {
	id: 'mk-eiju',
	brand: 'marukyu',
	name: 'Eiju',
	kanji: '永寿',
	grade: 'ceremonial',
	region: 'uji',
	taste: { x: 0.55, y: 0.55 },
	usuchaSuitable: true,
	koichaSuitable: true
};

describe('snapshotForTin', () => {
	it('copies name, brand-resolved maker, grade, region, and catalogId', () => {
		const snap = snapshotForTin(eiju);
		expect(snap).toMatchObject({
			name: 'Eiju',
			maker: 'Marukyu Kōyamaen',
			grade: 'ceremonial',
			region: 'uji',
			catalogId: 'mk-eiju'
		});
	});

	it('leaves cultivar undefined when the entry has no cultivars', () => {
		const snap = snapshotForTin(eiju);
		expect(snap.cultivar).toBeUndefined();
	});

	it('joins multiple cultivars with " · " separator', () => {
		const blend: CatalogEntry = {
			...eiju,
			id: 'mk-blend',
			cultivars: ['Asahi', 'Samidori', 'Gokō']
		};
		expect(snapshotForTin(blend).cultivar).toBe('Asahi · Samidori · Gokō');
	});

	it('passes a single cultivar through as-is', () => {
		const single: CatalogEntry = {
			...eiju,
			id: 'mk-single',
			cultivars: ['Yabukita']
		};
		expect(snapshotForTin(single).cultivar).toBe('Yabukita');
	});

	it('does not carry taste / description / price into the snapshot', () => {
		const snap = snapshotForTin({
			...eiju,
			description: 'a description',
			jpyPerGram: 100
		});
		// Snapshot intentionally drops these — Tin only owns the basics.
		expect('description' in snap).toBe(false);
		expect('jpyPerGram' in snap).toBe(false);
		expect('taste' in snap).toBe(false);
	});
});
