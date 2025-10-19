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
