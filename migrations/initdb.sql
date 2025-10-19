DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'region') THEN
        CREATE TYPE region AS ENUM ('USA', 'EUR', 'IND', 'SGP');
    END IF;
END$$;

CREATE TABLESPACE usa_ts WITH (replica_placement='{"num_replicas": 1, "placement_blocks": [{"cloud":"local","region":"usa","zone":"a","min_num_replicas":1}]}');
CREATE TABLESPACE eur_ts WITH (replica_placement='{"num_replicas": 1, "placement_blocks": [{"cloud":"local","region":"deu","zone":"a","min_num_replicas":1}]}');
CREATE TABLESPACE ind_ts WITH (replica_placement='{"num_replicas": 1, "placement_blocks": [{"cloud":"local","region":"ind","zone":"a","min_num_replicas":1}]}');
CREATE TABLESPACE sgp_ts WITH (replica_placement='{"num_replicas": 1, "placement_blocks": [{"cloud":"local","region":"sgp","zone":"a","min_num_replicas":1}]}');

CREATE TABLE users (
    region region NOT NULL,
    handle TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email_address TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(region, handle)
) PARTITION BY LIST (region);

-- Create partitions for each region
CREATE TABLE users_usa PARTITION OF users FOR VALUES IN ('USA');
CREATE TABLE users_eur PARTITION OF users FOR VALUES IN ('EUR');
CREATE TABLE users_ind PARTITION OF users FOR VALUES IN ('IND');
CREATE TABLE users_sgp PARTITION OF users FOR VALUES IN ('SGP');
