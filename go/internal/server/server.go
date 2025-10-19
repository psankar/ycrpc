package server

import (
	"context"
	ycrpcv1 "ycrpc/proto/gen/ycrpc/v1"
)

type Server struct {
}

func (s *Server) Signup(context.Context, *ycrpcv1.SignupRequest) (*ycrpcv1.SignupResponse, error) {
	return &ycrpcv1.SignupResponse{
		Handle: "user_handle_123",
	}, nil
}
