-- Chawan · allow half-point ratings
-- Change matcha_sessions.rating from integer to numeric so 0.5/1.5/2.5/etc
-- can be stored. Range CHECK (0..5) stays — it doesn't care about the
-- underlying type. Existing integer values cast losslessly to numeric.

alter table matcha_sessions
    alter column rating type numeric using rating::numeric;

comment on column matcha_sessions.rating is 'Half-point scale, 0 to 5 in 0.5 increments.';
