-- Chawan · enforce last-write-wins on the server
--
-- The sync layer pushes every local row with a plain PostgREST upsert
-- (INSERT … ON CONFLICT DO UPDATE). That cannot express a *conditional*
-- update, so without this trigger a stale device reconnecting would blindly
-- overwrite a newer server row — silently rolling back edits made on another
-- device, and (worse) resurrecting soft-deleted rows by overwriting their
-- tombstone with an older live copy.
--
-- This BEFORE UPDATE trigger makes the DO UPDATE a no-op whenever the incoming
-- row is OLDER than what is already stored (compared on "updatedAt"). Returning
-- OLD preserves the newer stored row without raising an error, so the stale
-- device's push still "succeeds" quietly — it just doesn't clobber anything.
-- Equal timestamps fall through to NEW (idempotent same-second re-save).
--
-- Together with the client-side merge (pull writes a server row into Dexie only
-- when it is newer-or-equal to the local copy — see src/lib/sync.svelte.ts),
-- this makes "last-write-wins via updatedAt" true on both sides.
--
-- Apply after 0005_tin_price_notes.sql. Idempotent.

create or replace function chawan_reject_stale_write()
    returns trigger
    language plpgsql
as $$
begin
    if NEW."updatedAt" < OLD."updatedAt" then
        return OLD;  -- keep the newer stored row; the stale write is ignored
    end if;
    return NEW;
end;
$$;

drop trigger if exists matcha_tins_lww on matcha_tins;
create trigger matcha_tins_lww
    before update on matcha_tins
    for each row execute function chawan_reject_stale_write();

drop trigger if exists matcha_sessions_lww on matcha_sessions;
create trigger matcha_sessions_lww
    before update on matcha_sessions
    for each row execute function chawan_reject_stale_write();
