package service

import (
	"log"

	"github.com/Coke0807/AI-SmartTodo/backend/internal/config"
	"github.com/Coke0807/AI-SmartTodo/backend/pkg/pb"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

var AIClient pb.AIServiceClient
var conn *grpc.ClientConn

// InitAIClient initializes the gRPC connection to the AI service.
func InitAIClient() {
	addr := config.AppConfig.AIServiceGRPCAddr
	log.Printf("Connecting to AI service via gRPC on %s in background", addr)

	// Why: grpc.Dial is deprecated since gRPC v1.63; grpc.NewClient establishes a
	// lazy connection (no immediate network I/O) and is the recommended replacement.
	c, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Printf("Failed to create AI gRPC client: %v", err)
		return
	}

	conn = c
	AIClient = pb.NewAIServiceClient(conn)
	log.Println("AI service gRPC client initialized")
}

// CloseAIClient closes the gRPC connection.
func CloseAIClient() {
	if conn != nil {
		log.Println("Closing AI service gRPC connection")
		conn.Close()
	}
}
