# ycrpc

A demo application showing YugabyteDB and ConnectRPC

## Instructions

```
$ docker compose down; rm -rf vol-*; docker compose up --build


# Validation failure
====================
$ curl -X POST http://localhost:8080/ycrpc.v1.YCRPCService/Signup \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "password": "pass",
    "region": "REGION_USA"
  }'

{"code":"invalid_argument","message":"invalid request","details":[{"type":"ycrpc.v1.InvalidFields","value":"CghwYXNzd29yZA","debug":{"fields":["password"]}}]}


# Create a new User
===================
$ curl -X POST http://localhost:8080/ycrpc.v1.YCRPCService/Signup \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "password": "passwordstronger",
    "region": "REGION_USA"
  }'

{"handle":"johndo-1760982292cd4cb4abe0b1-usa"}


# Failure to create duplicate user
==================================
$ curl -X POST http://localhost:8080/ycrpc.v1.YCRPCService/Signup \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "password": "passwordstronger",
    "region": "REGION_USA"
  }'

{"code":"already_exists","message":"user with this email address already exists"}
```

## Database Access

After running `docker compose up`, you can connect to the YugabyteDB cluster and explore the geo-partitioned data:

### Connect to YugabyteDB Shell

```bash
# Connect to any regional node (all contain the same logical database)
$ docker exec -it yugabytedb-node1 ysqlsh -h yugabytedb-node1 -U yugabyte

# Or connect to other regional nodes:
$ docker exec -it yugabytedb-node2 ysqlsh -h yugabytedb-node2 -U yugabyte
$ docker exec -it yugabytedb-node3 ysqlsh -h yugabytedb-node3 -U yugabyte
$ docker exec -it yugabytedb-node4 ysqlsh -h yugabytedb-node4 -U yugabyte
```

### Explore Sample Data

Once connected to the YugabyteDB shell, you can run these queries:

```sql
-- View all users across all regions
SELECT region, long_handle, full_name, email_address FROM users;

-- View users by specific region
SELECT * FROM users WHERE region = 'USA';
SELECT * FROM users WHERE region = 'EUR';
SELECT * FROM users WHERE region = 'IND';
SELECT * FROM users WHERE region = 'SGP';

-- View tablespace information
SELECT spcname, spcoptions FROM pg_tablespace WHERE spcname LIKE '%_ts';

-- Check partition-wise row counts
SELECT 'users_usa' as partition, count(*) FROM users_usa
UNION ALL
SELECT 'users_eur' as partition, count(*) FROM users_eur
UNION ALL
SELECT 'users_ind' as partition, count(*) FROM users_ind
UNION ALL
SELECT 'users_sgp' as partition, count(*) FROM users_sgp;
```

### Web UI Access

You can also access the YugabyteDB web interfaces:

- **Master UI**: http://localhost:7001 (cluster overview)
- **TServer UIs**:
  - USA: http://localhost:9001
  - EUR: http://localhost:9002
  - IND: http://localhost:9003
  - SGP: http://localhost:9004

## IDE Support

```bash
# Install tools once
$ go install github.com/bufbuild/buf/cmd/buf@latest
$ go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
$ go install connectrpc.com/connect/cmd/protoc-gen-connect-go@latest
$ go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# Generate the libraries
$ cd proto && rm -rf gen && buf lint && buf generate
$ cd sqlc && sqlc generate
```
