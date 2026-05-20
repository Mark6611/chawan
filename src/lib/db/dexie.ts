// Dexie schema and singleton db instance.
//
// IMPORTANT: This module is ONLY imported by src/lib/db/repository.ts.
// Components and pages must go through the repository — never call
// `db.tins.toArray()` directly. The boundary is what lets Phase 2 swap
// Dexie out for a Supabase-backed implementation without touching the UI.

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
	}
}

export const db = new ChawanDexie();
