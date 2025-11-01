package main

import (
	"log"
	"net/http"

	"github.com/rs/cors"
	"ycrpc/gen/ycrpc/v1/ycrpcv1connect"
	"ycrpc/internal/server"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	server, err := server.NewServer()
	if err != nil {
		log.Fatalf("failed to create server: %v", err)
		return
	}

	mux := http.NewServeMux()
	path, handler := ycrpcv1connect.NewYCRPCServiceHandler(server)
	mux.Handle(path, handler)

	// Add CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedMethods: []string{http.MethodPost},
		AllowedHeaders: []string{"Content-Type", "Connect-Protocol-Version"},
	})
	corsHandler := c.Handler(mux)

	p := new(http.Protocols)
	p.SetHTTP1(true)
	// Use h2c so we can serve HTTP/2 without TLS.
	p.SetUnencryptedHTTP2(true)

	log.Println("Starting server on :8080")

	s := http.Server{
		Addr:      ":8080",
		Handler:   corsHandler, // Use the CORS-wrapped handler
		Protocols: p,
	}
	s.ListenAndServe()
}
