all:
	cd proto && rm -rf gen && buf dep update && buf lint && buf generate
	cd sqlc && sqlc generate
