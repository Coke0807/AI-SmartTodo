package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/Coke0807/AI-SmartTodo/backend/pkg/pb"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	addr := "127.0.0.1:50051"
	log.Printf("Connecting to gRPC server at %s...", addr)

	conn, err := grpc.Dial(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	client := pb.NewAIServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Test Ping
	pingResp, err := client.Ping(ctx, &pb.PingRequest{Value: "Hello SmartTodo"})
	if err != nil {
		log.Fatalf("Ping failed: %v", err)
	}
	fmt.Printf("Ping Success! Response: %s\n", pingResp.Value)

	// Test SplitTask
	splitResp, err := client.SplitTask(ctx, &pb.SplitTaskRequest{
		Title:       "准备毕业答辩",
		Description: "准备企业综合实训的毕业答辩PPT和演讲",
	})
	if err != nil {
		log.Fatalf("SplitTask failed: %v", err)
	}
	fmt.Println("SplitTask Success!")
	fmt.Printf("Title: %s\n", splitResp.Title)
	fmt.Printf("Priority: %s\n", splitResp.Priority)
	fmt.Printf("Estimated Time: %s\n", splitResp.EstimatedTime)
	fmt.Println("SubTasks:")
	for _, st := range splitResp.SubTasks {
		fmt.Printf("- [%v] %s\n", st.Completed, st.Title)
	}
}
