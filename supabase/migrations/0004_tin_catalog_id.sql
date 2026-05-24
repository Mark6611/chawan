-- Chawan · Tin.catalogId soft link to Phase-3 catalog entries
-- Adds a nullable catalogId column to matcha_tins. Tins created via the
-- catalog picker carry the source CatalogEntry's id here; tins created
-- manually leave it null. Drives the "I've tried" indicator on the
-- catalog browse + chart screens.
--
-- Apply after 0003_rating_decimals.sql. Idempotent.

alter table matcha_tins
    add column if not exists "catalogId" text;

comment on column matcha_tins."catalogId" is 'Soft link to src/lib/catalog/matcha-catalog.ts entry id. Set when the tin was created via the catalog picker; null otherwise. Surface as the "I''ve tried" indicator on catalog screens.';
