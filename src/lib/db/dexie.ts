// Dexie schema and singleton db instance.
//
// IMPORTANT: This module is ONLY imported by src/lib/db/repository.ts
// and src/lib/sync.svelte.ts (for bulk push/pull). Components and pages
// must go through the repository — never call `db.tins.toArray()`
// directly. The boundary is what lets Phase 2 swap implementations
// without touching the UI.

import Dexie, { type Table } from 'dexie';
import type { Tin, Session } from './types';

export class ChawanDexie extends Dexie {
	tins!: Table<Tin, string>;
	sessions!: Table<Session, string>;

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
	}
}

export const db = new ChawanDexie();
