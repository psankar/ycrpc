package server

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	ycrpcv1 "ycrpc/proto/gen/ycrpc/v1"
	"ycrpc/sqlc/db"

	"buf.build/go/protovalidate"
	"connectrpc.com/connect"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
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
	// databaseURL += "?load_balance=true&yb_servers_refresh_interval=300"

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
	if err := s.validator.Validate(req); err != nil {
		slog.Debug("validation failed", "error", err)

		fields := make([]string, 0, 4)
		if valErr, ok := err.(*protovalidate.ValidationError); ok {
			for _, violation := range valErr.Violations {
				if fieldPath := violation.Proto.GetField(); fieldPath != nil {
					elements := fieldPath.GetElements()
					if len(elements) > 0 {
						fields = append(fields, elements[0].GetFieldName())
					}
				}
			}
		}

		detail := &ycrpcv1.InvalidFields{Fields: fields}
		cerr := connect.NewError(connect.CodeInvalidArgument, errors.New("invalid request"))
		if det, derr := connect.NewErrorDetail(detail); derr == nil {
			cerr.AddDetail(det)
		}
		return nil, cerr
	}

	// Convert protobuf region enum to database string
	var region db.Region
	var regionStr string
	switch req.Region {
	case ycrpcv1.Region_REGION_USA:
		region = db.RegionUsa
		regionStr = "usa"
	case ycrpcv1.Region_REGION_EUR:
		region = db.RegionEur
		regionStr = "eur"
	case ycrpcv1.Region_REGION_IND:
		region = db.RegionInd
		regionStr = "ind"
	case ycrpcv1.Region_REGION_SGP:
		region = db.RegionSgp
		regionStr = "sgp"
	default:
		// This should never happen due to protovalidate validation
		cerr := connect.NewError(connect.CodeInvalidArgument, errors.New("invalid request"))
		if det, derr := connect.NewErrorDetail(&ycrpcv1.InvalidFields{Fields: []string{"region"}}); derr == nil {
			cerr.AddDetail(det)
		}
		return nil, cerr
	}

	handle, err := generateHandle(req.FullName, regionStr)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, errors.New(""))
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		slog.Error("failed to hash password", "error", err)
		return nil, connect.NewError(connect.CodeInternal, errors.New(""))
	}

	// Start a transaction so we insert into users and global_email_addresses atomically.
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		slog.Error("failed to begin transaction", "error", err)
		return nil, connect.NewError(connect.CodeInternal, errors.New(""))
	}
	// Ensure rollback if anything goes wrong. If commit succeeds we'll set tx = nil to avoid rollback.
	defer func() {
		if tx != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	queries := db.New(s.pool).WithTx(tx)

	// Insert user and return generated id
	userID, err := queries.InsertUser(ctx, db.InsertUserParams{
		Region:       region,
		LongHandle:   handle,
		FullName:     req.FullName,
		EmailAddress: req.Email,
		PasswordHash: string(hashedPassword),
	})
	if err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok {
			if pgErr.Code == "23505" {
				if pgErr.ConstraintName == "uniq_handle" {
					slog.Error("duplicate long_handle generated", "handle", handle)
					return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("user with this handle already exists"))
				} else {
					slog.Error("unknown unique violation", "constraint", pgErr.ConstraintName, "error", err)
					return nil, connect.NewError(connect.CodeInternal, errors.New(""))
				}
			}
		}
		slog.Error("failed to insert user", "error", err, "region", regionStr, "handle", handle)
		return nil, connect.NewError(connect.CodeInternal, errors.New(""))
	}

	// Compute SHA256 of the (normalized) email address to store in global_email_addresses
	emailNorm := strings.ToLower(strings.TrimSpace(req.Email))
	sum := sha256.Sum256([]byte(emailNorm))
	emailSha := hex.EncodeToString(sum[:])

	// Insert into global_email_addresses to enforce a global-unique email across regions
	err = queries.InsertGlobalEmail(ctx, db.InsertGlobalEmailParams{
		EmailAddressSha: emailSha,
		Region:          region,
		UserID:          userID,
	})
	if err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok {
			if pgErr.Code == "23505" {
				slog.Debug("duplicate email address", "email", req.Email)
				return nil, connect.NewError(connect.CodeAlreadyExists, fmt.Errorf("user with this email address already exists"))
			}
		}
		slog.Error("failed to insert global email address", "error", err, "email", req.Email)
		return nil, connect.NewError(connect.CodeInternal, errors.New(""))
	}

	// Commit the transaction
	if err := tx.Commit(ctx); err != nil {
		slog.Error("failed to commit transaction", "error", err)
		return nil, connect.NewError(connect.CodeInternal, errors.New(""))
	}
	// Mark tx as nil so deferred rollback doesn't run
	tx = nil

	slog.Info("user created successfully", "handle", handle, "region", regionStr)
	return &ycrpcv1.SignupResponse{Handle: handle}, nil
}

func generateHandle(fullName, region string) (string, error) {
	// Truncate or pad fullName to max 6 characters
	// Add current unix timestamp to ensure uniqueness
	// Add random bytes read from crypto/rand for extra uniqueness
	// Append region code at the end
	// Format: <sanitizedName>-<unixTimestamp><randomBytes>-<region>

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
			slog.Error("failed to generate random character", "error", err)
			return "", errors.New("")
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
		slog.Error("failed to generate random bytes", "error", err)
		return "", errors.New("")
	}

	// Convert random bytes to hex string
	randomHex := hex.EncodeToString(randomBytes)

	// Format: <name>-<unixTimestamp><randomBytes>-<region>
	handle := fmt.Sprintf("%s-%d%s-%s", name, timestamp, randomHex, region)

	return handle, nil
}
