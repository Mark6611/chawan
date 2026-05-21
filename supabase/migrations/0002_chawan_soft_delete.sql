-- Chawan · soft-delete columns
-- Add a deletedAt tombstone column to both tables so cross-device deletion
-- propagates through sync. When deletedAt is null, the row is live; when set,
-- the row is "deleted" (filtered out by all read paths in the app).
--
-- Apply after 0001_chawan_initial.sql. Idempotent.

alter table matcha_tins
    add column if not exists "deletedAt" timestamptz;

alter table matcha_sessions
    add column if not exists "deletedAt" timestamptz;

-- Partial indexes for the common case (filtering out deleted rows).
create index if not exists matcha_tins_user_live_idx
    on matcha_tins ("userId", "createdAt" desc) where "deletedAt" is null;

create index if not exists matcha_sessions_user_live_idx
    on matcha_sessions ("userId", "brewedAt" desc) where "deletedAt" is null;

comment on column matcha_tins."deletedAt" is 'Tombstone timestamp. Null = live; set = deleted (filtered out by reads). Soft delete enables cross-device deletion via sync.';
comment on column matcha_sessions."deletedAt" is 'Tombstone timestamp. Null = live; set = deleted (filtered out by reads).';
