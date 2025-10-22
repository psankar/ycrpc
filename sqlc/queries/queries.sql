-- name: InsertUser :one
INSERT INTO users (region, long_handle, full_name, email_address, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id;

-- name: InsertGlobalEmail :exec
INSERT INTO global_email_addresses (email_address_sha, region, user_id) VALUES ($1, $2, $3);
