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
