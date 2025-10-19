# ycrpc

A demo application showing YugabyteDB and ConnectRPC

## Build Instructions

- Setup tools

```
$ go install github.com/bufbuild/buf/cmd/buf@latest
$ go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
$ go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
$ go install connectrpc.com/connect/cmd/protoc-gen-connect-go@latest
```

- Generate libraries

```
$ cd proto
proto $ buf lint && buf generate
```

- Run the server

```
$ go run go/cmd/ycrpc-server.go
```
