CREATE TYPE region AS ENUM ('usa', 'eur', 'ind', 'sgp');

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'region') THEN
        -- Type already created above
    END IF;
END$$;

CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid(),
    region region NOT NULL,
    long_handle TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email_address TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uniq_handle UNIQUE(region, long_handle),
    PRIMARY KEY(region, id)
);

CREATE TABLE global_email_addresses (
    email_address_sha TEXT PRIMARY KEY NOT NULL,
    region region NOT NULL,
    user_id UUID NOT NULL,

    CONSTRAINT uniq_email FOREIGN KEY (region, user_id) REFERENCES users(region, id)
);
