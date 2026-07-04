-- Chawan · tin price + notes (parity with the coffee app's bag recording)
-- Adds what-you-paid + free notes to matcha_tins. Money as integer cents +
-- ISO 4217 currency, same shape as matcha_sessions' price columns.
--
-- ⚠ Run BEFORE saving any tin with a price/notes on the new app version —
-- PostgREST rejects upserts containing unknown columns, so a tin push with
-- these fields fails until this migration lands (tins without them are
-- unaffected; JSON.stringify drops undefined keys).
--
-- Apply after 0004_tin_catalog_id.sql. Idempotent.

alter table matcha_tins
    add column if not exists "priceCents" integer
        check ("priceCents" is null or "priceCents" >= 0);

alter table matcha_tins
    add column if not exists "priceCurrency" text
        check ("priceCurrency" is null or "priceCurrency" ~ '^[A-Z]{3}$');

alter table matcha_tins
    add column if not exists notes text;

comment on column matcha_tins."priceCents" is 'What the user paid for the tin, integer cents. Set together with priceCurrency or not at all.';
comment on column matcha_tins.notes is 'Free-form notes about the tin (source, impressions, gift provenance, …).';

-- Note: tin PHOTOS are deliberately NOT in this migration — they live in a
-- device-local IndexedDB table (tinPhotos) and do not sync. Cross-device
-- photo sync would need a Supabase Storage bucket + RLS storage policies;
-- revisit as its own phase if wanted.
