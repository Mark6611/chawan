// Dexie schema and singleton db instance.
//
// IMPORTANT: This module is ONLY imported by src/lib/db/repository.ts.
// Components and pages must go through the repository — never call
// `db.tins.toArray()` directly. The boundary is what keeps storage
// swappable without touching the UI.

import Dexie, { type Table } from 'dexie';
import type { Tin, TinPhoto, Session } from './types';

export class ChawanDexie extends Dexie {
	tins!: Table<Tin, string>;
	sessions!: Table<Session, string>;
	tinPhotos!: Table<TinPhoto, string>;

	constructor() {
		super('chawan');
		// Schema string syntax: primary key first, then secondary indexes.
		// `tinId` is indexed on sessions so we can query a tin's history quickly;
		// `brewedAt` is indexed so the chronological feed sorts efficiently.
		this.version(1).stores({
			tins: 'id, archived, openedAt, createdAt',
			sessions: 'id, kind, tinId, brewedAt, createdAt'
		});

		// v2: rename legacy `kind: 'store'` sessions to `kind: 'cafe'` and
		// move `storeName` → `cafeName`. The schema rename happened in commit
		// 1a850e4 (Session 2 follow-up); any browser that touched the app
		// before then has rows that still use the old field names.
		//
		// The IDB indexes don't change — we only mutate the row data.
		// Dexie requires a stores() call on each version even when unchanged.
		this.version(2)
			.stores({
				tins: 'id, archived, openedAt, createdAt',
				sessions: 'id, kind, tinId, brewedAt, createdAt'
			})
			.upgrade(async (tx) => {
				let renamedKind = 0;
				let renamedField = 0;
				// Dexie's modify() iterates in place. The callback receives the
				// raw row object; mutate it directly.
				await tx
					.table('sessions')
					.toCollection()
					.modify((s: Record<string, unknown>) => {
						if (s.kind === 'store') {
							s.kind = 'cafe';
							renamedKind++;
						}
						if (typeof s.storeName === 'string') {
							s.cafeName = s.storeName;
							delete s.storeName;
							renamedField++;
						}
					});
				console.info(
					`[dexie] v1→v2 migration: ${renamedKind} kind(s) and ${renamedField} field(s) renamed`
				);
			});

		// v3: tinPhotos — device-local photo per tin, keyed by tinId.
		// IndexedDB stores Blobs natively. Deliberately a separate table so
		// the Tin record itself stays JSON-serializable for sync + backup
		// (photos don't cross either wire; see TinPhoto in types.ts).
		this.version(3).stores({
			tins: 'id, archived, openedAt, createdAt',
			sessions: 'id, kind, tinId, brewedAt, createdAt',
			tinPhotos: 'tinId'
		});

		// v4: tinPhotos gains `deletedAt` and its `blob` becomes optional, so a
		// removed photo leaves a tombstone like tins and sessions always have.
		// Without one, deleting a photo removed the row outright, and restoring
		// any older backup found no existing record to lose to and put the photo
		// straight back.
		//
		// Indexes are unchanged (still keyed by tinId) and every existing row is
		// already valid under the new shape — a live photo simply has no
		// deletedAt. The bump exists because the row SHAPE changed: this app's
		// rule is that a field change ships with a version bump and an upgrade()
		// in the same commit, so the migration is explicit rather than implied.
		this.version(4)
			.stores({
				tins: 'id, archived, openedAt, createdAt',
				sessions: 'id, kind, tinId, brewedAt, createdAt',
				tinPhotos: 'tinId'
			})
			.upgrade(async (tx) => {
				// Nothing to rewrite: pre-v4 rows all carry a blob and no
				// deletedAt, which is exactly a live photo. Counted so the
				// migration is visible in the console rather than silent.
				const n = await tx.table('tinPhotos').count();
				console.info(`[dexie] v3→v4: ${n} photo row(s) now tombstone-capable`);
			});
	}
}

export const db = new ChawanDexie();
