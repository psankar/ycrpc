DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'region') THEN
        CREATE TYPE region AS ENUM ('usa', 'eur', 'ind', 'sgp');
    END IF;
END$$;

CREATE TABLESPACE usa_ts WITH (replica_placement='{"num_replicas": 1, "placement_blocks": [{"cloud":"local","region":"usa","zone":"usa-a","min_num_replicas":1}]}');
CREATE TABLESPACE eur_ts WITH (replica_placement='{"num_replicas": 1, "placement_blocks": [{"cloud":"local","region":"eur","zone":"eur-a","min_num_replicas":1}]}');
CREATE TABLESPACE ind_ts WITH (replica_placement='{"num_replicas": 1, "placement_blocks": [{"cloud":"local","region":"ind","zone":"ind-a","min_num_replicas":1}]}');
CREATE TABLESPACE sgp_ts WITH (replica_placement='{"num_replicas": 1, "placement_blocks": [{"cloud":"local","region":"sgp","zone":"sgp-a","min_num_replicas":1}]}');

CREATE TABLE users (
    region region NOT NULL,
    long_handle TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email_address TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(region, long_handle)
) PARTITION BY LIST (region);

-- Create partitions for each region
CREATE TABLE users_usa PARTITION OF users FOR VALUES IN ('usa') TABLESPACE usa_ts;
CREATE TABLE users_eur PARTITION OF users FOR VALUES IN ('eur') TABLESPACE eur_ts;
CREATE TABLE users_ind PARTITION OF users FOR VALUES IN ('ind') TABLESPACE ind_ts;
CREATE TABLE users_sgp PARTITION OF users FOR VALUES IN ('sgp') TABLESPACE sgp_ts;
