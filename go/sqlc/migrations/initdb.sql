CREATE TYPE region AS ENUM ('usa', 'eur', 'ind', 'sgp');

CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid(),
    region region NOT NULL,
    long_handle TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email_address TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (region, id)
) PARTITION BY LIST (region);

CREATE TABLE users_usa PARTITION OF users
    (CONSTRAINT uniq_handle_usa UNIQUE(region, long_handle))
    FOR VALUES IN ('usa') TABLESPACE usa_tablespace;

CREATE TABLE users_eur PARTITION OF users
    (CONSTRAINT uniq_handle_eur UNIQUE(region, long_handle))
    FOR VALUES IN ('eur') TABLESPACE eur_tablespace;

CREATE TABLE users_ind PARTITION OF users
    (CONSTRAINT uniq_handle_ind UNIQUE(region, long_handle))
    FOR VALUES IN ('ind') TABLESPACE ind_tablespace;

CREATE TABLE users_sgp PARTITION OF users
    (CONSTRAINT uniq_handle_sgp UNIQUE(region, long_handle))
    FOR VALUES IN ('sgp') TABLESPACE sgp_tablespace;

CREATE TABLE global_email_addresses (
    email_address_sha TEXT PRIMARY KEY NOT NULL,
    region region NOT NULL,
    user_id UUID NOT NULL,
    CONSTRAINT uniq_email FOREIGN KEY (region, user_id) REFERENCES users(region, id)
);
