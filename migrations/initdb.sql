DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'region') THEN
        CREATE TYPE region AS ENUM ('USA', 'EUR', 'IND', 'SGP');
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
CREATE TABLE users_usa PARTITION OF users FOR VALUES IN ('USA') TABLESPACE usa_ts;
CREATE TABLE users_eur PARTITION OF users FOR VALUES IN ('EUR') TABLESPACE eur_ts;
CREATE TABLE users_ind PARTITION OF users FOR VALUES IN ('IND') TABLESPACE ind_ts;
CREATE TABLE users_sgp PARTITION OF users FOR VALUES IN ('SGP') TABLESPACE sgp_ts;

-- Insert sample users for each region
INSERT INTO users (region, long_handle, full_name, email_address, password_hash) VALUES
-- USA users
('USA', 'john_doe_usa', 'John Doe', 'john.doe@example.com', '$2a$10$p7Z/hRlt3ZZiz1IbPSJUiOualKbokFExYiWWazpQvfv660LqskAUK'),
('USA', 'jane_smith_usa', 'Jane Smith', 'jane.smith@example.com', '$2a$10$p7Z/hRlt3ZZiz1IbPSJUiOualKbokFExYiWWazpQvfv660LqskAUK'),
('USA', 'mike_wilson_usa', 'Mike Wilson', 'mike.wilson@example.com', '$2a$10$p7Z/hRlt3ZZiz1IbPSJUiOualKbokFExYiWWazpQvfv660LqskAUK'),

-- EUR users
('EUR', 'anna_mueller_eur', 'Anna Müller', 'anna.mueller@example.com', '$2a$10$p7Z/hRlt3ZZiz1IbPSJUiOualKbokFExYiWWazpQvfv660LqskAUK'),
('EUR', 'pierre_martin_eur', 'Pierre Martin', 'pierre.martin@example.com', '$2a$10$p7Z/hRlt3ZZiz1IbPSJUiOualKbokFExYiWWazpQvfv660LqskAUK'),
('EUR', 'sofia_rossi_eur', 'Sofia Rossi', 'sofia.rossi@example.com', '$2a$10$p7Z/hRlt3ZZiz1IbPSJUiOualKbokFExYiWWazpQvfv660LqskAUK'),

-- IND users
('IND', 'aravind_ind', 'Aravind', 'aravind@example.com', '$2a$10$p7Z/hRlt3ZZiz1IbPSJUiOualKbokFExYiWWazpQvfv660LqskAUK'),
('IND', 'kishmu_ind', 'Krishnamurthi', 'krishnamurthi@example.com', '$2a$10$p7Z/hRlt3ZZiz1IbPSJUiOualKbokFExYiWWazpQvfv660LqskAUK'),
('IND', 'chandru_ind', 'Chandru', 'chandru@example.com', '$2a$10$p7Z/hRlt3ZZiz1IbPSJUiOualKbokFExYiWWazpQvfv660LqskAUK'),
('IND', 'amudha_ind', 'Amudha', 'amudha@example.com', '$2a$10$p7Z/hRlt3ZZiz1IbPSJUiOualKbokFExYiWWazpQvfv660LqskAUK'),

-- SGP users
('SGP', 'wei_lin_sgp', 'Wei Lin', 'wei.lin@example.com', '$2a$10$p7Z/hRlt3ZZiz1IbPSJUiOualKbokFExYiWWazpQvfv660LqskAUK'),
('SGP', 'siti_tan_sgp', 'Siti Tan', 'siti.tan@example.com', '$2a$10$p7Z/hRlt3ZZiz1IbPSJUiOualKbokFExYiWWazpQvfv660LqskAUK'),
('SGP', 'david_wong_sgp', 'David Wong', 'david.wong@example.com', '$2a$10$p7Z/hRlt3ZZiz1IbPSJUiOualKbokFExYiWWazpQvfv660LqskAUK');
