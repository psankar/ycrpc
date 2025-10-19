all:
	cd proto && rm -rf gen && buf lint && buf generate
	go run go/cmd/ycrpc-server.go
