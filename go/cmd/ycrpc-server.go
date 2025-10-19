package main

import (
	"log"
	"net/http"

	"ycrpc/go/internal/server"
	"ycrpc/proto/gen/ycrpc/v1/ycrpcv1connect"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	server := &server.Server{}
	mux := http.NewServeMux()

	path, handler := ycrpcv1connect.NewYCRPCServiceHandler(server)
	mux.Handle(path, handler)

	p := new(http.Protocols)
	p.SetHTTP1(true)
	// Use h2c so we can serve HTTP/2 without TLS.
	p.SetUnencryptedHTTP2(true)

	log.Println("Starting server on localhost:8080")

	s := http.Server{
		Addr:      "localhost:8080",
		Handler:   mux,
		Protocols: p,
	}
	s.ListenAndServe()
}
