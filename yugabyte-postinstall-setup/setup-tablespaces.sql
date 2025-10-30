-- This script must be run AFTER the YugabyteDB cluster is fully initialized
-- It creates tablespaces with region-specific placement policies for geo-partitioning

CREATE TABLESPACE usa_tablespace WITH (
  replica_placement='{"num_replicas": 1, "placement_blocks": 
  [{"cloud":"local","region":"usa","zone":"usa-a","min_num_replicas":1}]}'
);

CREATE TABLESPACE eur_tablespace WITH (
  replica_placement='{"num_replicas": 1, "placement_blocks":
  [{"cloud":"local","region":"eur","zone":"eur-a","min_num_replicas":1}]}'
);

CREATE TABLESPACE ind_tablespace WITH (
  replica_placement='{"num_replicas": 1, "placement_blocks":
  [{"cloud":"local","region":"ind","zone":"ind-a","min_num_replicas":1}]}'
);

CREATE TABLESPACE sgp_tablespace WITH (
  replica_placement='{"num_replicas": 1, "placement_blocks":
  [{"cloud":"local","region":"sgp","zone":"sgp-a","min_num_replicas":1}]}'
);
