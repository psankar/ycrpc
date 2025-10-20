package server

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"
	ycrpcv1 "ycrpc/proto/gen/ycrpc/v1"

	"buf.build/go/protovalidate"
	"github.com/yugabyte/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type server struct {
	pool      *pgxpool.Pool
	validator protovalidate.Validator
}

func NewServer() (*server, error) {
	// Get database URL from environment, default to connecting to all YugabyteDB nodes
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		// Default connection string with all YugabyteDB nodes for load balancing
		databaseURL = "postgres://yugabyte:yugabyte@yugabytedb-node1:5433,yugabytedb-node2:5433,yugabytedb-node3:5433,yugabytedb-node4:5433/yugabyte"
	}

	// Enable YugabyteDB smart driver features for geo-partitioning
	// load_balance=true enables cluster-aware load balancing
	// yb_servers_refresh_interval refreshes the server list periodically
	databaseURL += "?load_balance=true&yb_servers_refresh_interval=300"

	// Create connection pool with YugabyteDB smart driver
	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		slog.Error("failed to create database pool", "error", err)
		return nil, err
	}

	// Create protovalidate validator
	validator, err := protovalidate.New()
	if err != nil {
		slog.Error("failed to create validator", "error", err)
		return nil, err
	}

	slog.Info("connected to YugabyteDB cluster with geo-partitioning support")
	return &server{pool: pool, validator: validator}, nil
}

func (s *server) Signup(ctx context.Context, req *ycrpcv1.SignupRequest) (*ycrpcv1.SignupResponse, error) {
	// Validate request using protovalidate
	if err := s.validator.Validate(req); err != nil {
		slog.Error("validation failed", "error", err)
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	// Convert protobuf region enum to database string
	var regionStr string
	switch req.Region {
	case ycrpcv1.Region_REGION_USA:
		regionStr = "usa"
	case ycrpcv1.Region_REGION_EUR:
		regionStr = "eur"
	case ycrpcv1.Region_REGION_IND:
		regionStr = "ind"
	case ycrpcv1.Region_REGION_SGP:
		regionStr = "sgp"
	default:
		// This should never happen due to protovalidate validation
		return nil, fmt.Errorf("invalid region specified")
	}

	handle, err := generateHandle(req.FullName, regionStr)
	if err != nil {
		slog.Error("failed to generate handle", "error", err)
		return nil, fmt.Errorf("internal error")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		slog.Error("failed to hash password", "error", err)
		return nil, fmt.Errorf("failed to process password")
	}

	// Insert user into appropriate regional partition
	query := `
		INSERT INTO users (region, long_handle, full_name, email_address, password_hash) 
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err = s.pool.Exec(ctx, query, regionStr, handle, req.FullName, req.Email, string(hashedPassword))
	if err != nil {
		slog.Error("failed to insert user", "error", err, "region", regionStr, "handle", handle)
		return nil, fmt.Errorf("failed to create user account")
	}

	slog.Info("user created successfully", "handle", handle, "region", regionStr)
	return &ycrpcv1.SignupResponse{
		Handle: handle,
	}, nil
}

func generateHandle(fullName, region string) (string, error) {
	// Truncate or pad fullName to max 6 characters
	// Add current unix timestamp to ensure uniqueness
	// Add random bytes read from crypto/rand for extra uniqueness
	// Append region code at the end
	// Format: <name>-<unixTimestamp><randomBytes>-<region>

	// Normalize full name: lowercase, URL-safe, max 6 chars, padded if shorter
	name := strings.ToLower(fullName)

	// Remove non-printable and non-URL-safe characters (keep only alphanumeric)
	sanitized := ""
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			sanitized += string(r)
		}
		if len(sanitized) >= 6 {
			break
		}
	}

	// Pad with random alphanumeric characters if shorter than 6
	const alphanumeric = "abcdefghijklmnopqrstuvwxyz0123456789"
	for len(sanitized) < 6 {
		randomBytes := make([]byte, 1)
		_, err := rand.Read(randomBytes)
		if err != nil {
			return "", fmt.Errorf("failed to generate random character: %w", err)
		}
		sanitized += string(alphanumeric[int(randomBytes[0])%len(alphanumeric)])
	}

	name = sanitized

	// Get current unix timestamp
	timestamp := time.Now().Unix()

	// Generate 6 random bytes
	randomBytes := make([]byte, 6)
	_, err := rand.Read(randomBytes)
	if err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	// Convert random bytes to hex string
	randomHex := hex.EncodeToString(randomBytes)

	// Format: <name>-<unixTimestamp><randomBytes>-<region>
	handle := fmt.Sprintf("%s-%d%s-%s", name, timestamp, randomHex, region)

	return handle, nil
}
