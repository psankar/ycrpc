# ycrpc

A demo application showing YugabyteDB and ConnectRPC

## Instructions

```bash
$ docker compose up
$ curl -X POST http://localhost:8080/ycrpc.v1.YCRPCService/Signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "securepassword123",
    "region": "REGION_USA"
  }'
```

Expected response:

```json
{
  "handle": "user_handle_123"
}
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

You would need to generate the proto libraries for the code to work fine in the IDE. For that you need to download the `buf` tools once and generate the libraries everytime you change the .proto files.

```
# Install tools once
$ go install github.com/bufbuild/buf/cmd/buf@latest
$ go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
$ go install connectrpc.com/connect/cmd/protoc-gen-connect-go@latest

# Generate the libraries from proto
$ cd proto && rm -rf gen && buf lint && buf generate
```
