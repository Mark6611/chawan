-- Chawan · initial schema
-- Run this in the shared Supabase project (the same one the coffee app uses).
-- Auth users are shared across both apps; tables are separate.
--
-- Apply via either:
--   (a) Supabase dashboard → SQL editor → paste this file → Run
--   (b) Supabase CLI: `supabase db push` (after `supabase link`)
--
-- Column naming follows the coffee app's convention: camelCase columns
-- (matches the TS types, no snake_case translation in the sync layer).
-- Numeric columns are returned as strings by PostgREST and coerced back
-- to numbers in src/lib/sync.ts (Session 13).

-- ─── matcha_tins ────────────────────────────────────────────────────────

create table if not exists matcha_tins (
    id            uuid primary key,
    "userId"      uuid not null references auth.users(id) on delete cascade,

    name          text not null check (length(name) > 0),
    maker         text not null default '',
    grade         text not null check (grade in ('ceremonial', 'premium', 'culinary')),
    region        text not null check (region in ('uji', 'nishio', 'yame', 'kagoshima', 'shizuoka', 'other')),
    cultivar      text,
    "harvestDate" text,                                              -- ISO YYYY-MM-DD; text matches the TS shape
    "weightGrams" numeric not null check ("weightGrams" > 0),
    "openedAt"    timestamptz,
    archived      boolean not null default false,

    "createdAt"   timestamptz not null default now(),
    "updatedAt"   timestamptz not null default now()
);

-- Per-user lookups with active/archived split + sort by recency
create index if not exists matcha_tins_user_archived_idx
    on matcha_tins ("userId", archived);
create index if not exists matcha_tins_user_created_idx
    on matcha_tins ("userId", "createdAt" desc);

-- ─── matcha_sessions ───────────────────────────────────────────────────
-- Single-table discriminated union (matches the TS shape exactly).
-- `kind` is the discriminator; per-kind fields are nullable.
-- The CHECK constraint enforces mutual exclusion: a personal session
-- carries tinId + brewing params; a cafe session carries cafeName + region.

create table if not exists matcha_sessions (
    id              uuid primary key,
    "userId"        uuid not null references auth.users(id) on delete cascade,

    kind            text not null check (kind in ('personal', 'cafe')),
    "brewedAt"      timestamptz not null,
    style           text not null check (style in ('usucha', 'koicha', 'latte')),
    milk            text check (milk is null or milk in ('cow', 'oat', 'almond', 'soy', 'coconut', 'other')),
    rating          integer check (rating is null or (rating >= 0 and rating <= 5)),
    notes           text,

    -- Personal-only --
    "tinId"         uuid references matcha_tins(id) on delete set null,
    "powderGrams"   numeric check ("powderGrams" is null or "powderGrams" > 0),
    "waterGrams"    numeric check ("waterGrams" is null or "waterGrams" > 0),
    "waterTempC"    integer check ("waterTempC" is null or ("waterTempC" >= 0 and "waterTempC" <= 100)),
    whisk           text check (whisk is null or whisk in ('chasen-80', 'chasen-100', 'chasen-120', 'electric')),

    -- Cafe-only --
    "cafeName"      text,
    maker           text,                                            -- matcha brand the cafe sources from (optional)
    region          text check (region is null or region in ('uji', 'nishio', 'yame', 'kagoshima', 'shizuoka', 'other')),
    "priceCents"    integer check ("priceCents" is null or "priceCents" >= 0),
    "priceCurrency" text check ("priceCurrency" is null or "priceCurrency" ~ '^[A-Z]{3}$'),

    "createdAt"     timestamptz not null default now(),
    "updatedAt"     timestamptz not null default now(),

    -- Mutual exclusion: a session is either personal (tinId + powder/water) or cafe (cafeName + region).
    -- We allow other personal-only fields (whisk, milk) to be null on purpose; the form layer enforces
    -- "milk required when style=latte" before saving.
    constraint matcha_sessions_kind_shape check (
        (kind = 'personal' and "tinId" is not null and "powderGrams" is not null and "waterGrams" is not null and "waterTempC" is not null and "cafeName" is null and region is null and "priceCents" is null) or
        (kind = 'cafe' and "cafeName" is not null and region is not null and "tinId" is null and "powderGrams" is null and "waterGrams" is null and "waterTempC" is null and whisk is null)
    )
);

-- Chronological feed per user (the /sessions list query)
create index if not exists matcha_sessions_user_brewed_idx
    on matcha_sessions ("userId", "brewedAt" desc);

-- "From this tin" history lookup
create index if not exists matcha_sessions_user_tin_idx
    on matcha_sessions ("userId", "tinId") where "tinId" is not null;

-- ─── Row Level Security ────────────────────────────────────────────────
-- Per-user isolation. auth.uid() is the user's UUID from the JWT.

alter table matcha_tins enable row level security;
alter table matcha_sessions enable row level security;

-- matcha_tins policies
create policy "Users can see their own tins"
    on matcha_tins for select
    using (auth.uid() = "userId");

create policy "Users can insert their own tins"
    on matcha_tins for insert
    with check (auth.uid() = "userId");

create policy "Users can update their own tins"
    on matcha_tins for update
    using (auth.uid() = "userId")
    with check (auth.uid() = "userId");

create policy "Users can delete their own tins"
    on matcha_tins for delete
    using (auth.uid() = "userId");

-- matcha_sessions policies
create policy "Users can see their own sessions"
    on matcha_sessions for select
    using (auth.uid() = "userId");

create policy "Users can insert their own sessions"
    on matcha_sessions for insert
    with check (auth.uid() = "userId");

create policy "Users can update their own sessions"
    on matcha_sessions for update
    using (auth.uid() = "userId")
    with check (auth.uid() = "userId");

create policy "Users can delete their own sessions"
    on matcha_sessions for delete
    using (auth.uid() = "userId");

-- ─── Comments (handy for the Supabase dashboard) ───────────────────────

comment on table matcha_tins is 'User-owned matcha powder inventory. Personal sessions deduct from tins.';
comment on table matcha_sessions is 'Discriminated union: personal (brewed at home from a tin) or cafe (bought a cup). Single table; kind column discriminates.';
comment on column matcha_sessions.kind is 'Discriminator: "personal" (tinId + brew params) or "cafe" (cafeName + region + price).';
comment on column matcha_sessions.maker is 'Cafe-only: the matcha brand the cafe sources from (Marukyu Kōyamaen, etc.). Optional.';
comment on column matcha_tins.maker is 'Tin-only: the brand on the tin (Marukyu Kōyamaen, Ippodo, etc.).';
