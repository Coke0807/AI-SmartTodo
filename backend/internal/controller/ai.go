package controller

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/Coke0807/AI-SmartTodo/backend/internal/config"
	"github.com/Coke0807/AI-SmartTodo/backend/internal/service"
	"github.com/Coke0807/AI-SmartTodo/backend/pkg/pb"
	"github.com/gin-gonic/gin"
)

type ChatReq struct {
	Message string    `json:"message" binding:"required"`
	History []ChatMsg `json:"history"`
	Config  *AiConfig `json:"config"`
}

type ChatMsg struct {
	Role    string `json:"role"` // "user" or "assistant"
	Content string `json:"content"`
}

type RAGReq struct {
	Query  string    `json:"query" binding:"required"`
	Config *AiConfig `json:"config"`
}

// Chat forwards a conversation to the AI service.
func Chat(c *gin.Context) {
	var req ChatReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if service.AIClient == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service is currently unavailable"})
		return
	}

	// Map history
	protoHistory := make([]*pb.ChatMessage, len(req.History))
	for i, msg := range req.History {
		protoHistory[i] = &pb.ChatMessage{
			Role:    msg.Role,
			Content: msg.Content,
		}
	}

	var protoConfig *pb.AIConfig
	if req.Config != nil {
		protoConfig = &pb.AIConfig{
			Mode:          req.Config.Mode,
			LocalEndpoint: req.Config.LocalEndpoint,
			CloudEndpoint: req.Config.CloudEndpoint,
			ApiKey:        req.Config.ApiKey,
			ModelLocal:    req.Config.ModelLocal,
			ModelCloud:    req.Config.ModelCloud,
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := service.AIClient.Chat(ctx, &pb.ChatRequest{
		Message: req.Message,
		History: protoHistory,
		Config:  protoConfig,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to call Chat service: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"response": resp.Response,
		},
	})
}

// ChatStream proxies SSE streaming chat from the Python AI service to the frontend.
func ChatStream(c *gin.Context) {
	// Why: Read the AI service address from environment config to build the streaming URL.
	aiAddr := config.AppConfig.AIServiceGRPCAddr // e.g., "127.0.0.1:50051"
	// Extract host from gRPC address, use configurable HTTP port for FastAPI
	host := strings.Split(aiAddr, ":")[0]
	streamURL := fmt.Sprintf("http://%s:%s/v1/chat/stream", host, config.AppConfig.AIServiceHTTPPort)

	// Forward the request body to the Python streaming endpoint
	reqBody, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}
	defer c.Request.Body.Close()

	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, "POST", streamURL, io.NopCloser(strings.NewReader(string(reqBody))))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create streaming request"})
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to connect to AI streaming service: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	// Set SSE headers on the response to the frontend
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.Status(http.StatusOK)

	// Stream the response body to the client
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Streaming not supported"})
		return
	}

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		fmt.Fprintf(c.Writer, "%s\n", line)
		flusher.Flush()
	}

	if err := scanner.Err(); err != nil {
		fmt.Printf("[ChatStream] scanner error: %v\n", err)
	}
}

// UploadFile uploads a text/markdown file for RAG.
func UploadFile(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	// Why: Enforce a 5MB upload limit to prevent disk/memory exhaustion attacks.
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 5<<20)

	file, err := c.FormFile("file")
	if err != nil {
		// Check if the error is due to the file being too large
		if err.Error() == "http: request body too large" {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "File size exceeds the 5MB limit"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Validate extension
	ext := filepath.Ext(file.Filename)
	if ext != ".txt" && ext != ".md" && ext != ".markdown" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only .txt and .md files are allowed"})
		return
	}

	// Create user-specific upload directory
	uploadDir := filepath.Join("uploads", "user_"+strconv.FormatUint(uint64(userID), 10))
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Save file
	dst := filepath.Join(uploadDir, file.Filename)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   "success",
		"filename": file.Filename,
		"message":  "File uploaded successfully",
	})
}

// RAGQuery reads the user's uploaded files, combines them, and queries the AI service.
func RAGQuery(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var req RAGReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if service.AIClient == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service is currently unavailable"})
		return
	}

	// Read all files in the user's upload directory
	uploadDir := filepath.Join("uploads", "user_"+strconv.FormatUint(uint64(userID), 10))
	var combinedContent string
	var fileCount int

	// Check if directory exists
	if _, err := os.Stat(uploadDir); err == nil {
		files, err := os.ReadDir(uploadDir)
		if err == nil {
			for _, f := range files {
				if !f.IsDir() {
					filePath := filepath.Join(uploadDir, f.Name())
					content, err := os.ReadFile(filePath)
					if err == nil {
						combinedContent += "\n--- File: " + f.Name() + " ---\n" + string(content) + "\n"
						fileCount++
					}
				}
			}
		}
	}

	mode := "hybrid"
	if req.Config != nil && req.Config.Mode != "" {
		mode = req.Config.Mode
	}
	fmt.Printf("[RAG] user=%d files=%d mode=%s query=%q\n", userID, fileCount, mode, req.Query)

	var protoConfig *pb.AIConfig
	if req.Config != nil {
		protoConfig = &pb.AIConfig{
			Mode:          req.Config.Mode,
			LocalEndpoint: req.Config.LocalEndpoint,
			CloudEndpoint: req.Config.CloudEndpoint,
			ApiKey:        req.Config.ApiKey,
			ModelLocal:    req.Config.ModelLocal,
			ModelCloud:    req.Config.ModelCloud,
		}
	}

	// Why: RAG queries involve document processing and LLM inference,
	// which can be slow especially with large documents or cold models.
	// Set a generous timeout to accommodate these operations.
	ctx, cancel := context.WithTimeout(c.Request.Context(), 120*time.Second)
	defer cancel()

	resp, err := service.AIClient.RAGQuery(ctx, &pb.RAGQueryRequest{
		Query:      req.Query,
		DocContent: combinedContent,
		Config:     protoConfig,
	})
	if err != nil {
		fmt.Printf("[RAG] user=%d RAGQuery failed: %v\n", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to call RAG service: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"answer": resp.Answer,
		},
	})
}

// GetUploadedFiles returns a list of uploaded files for the current user.
func GetUploadedFiles(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	uploadDir := filepath.Join("uploads", "user_"+strconv.FormatUint(uint64(userID), 10))

	var filesList []string
	if _, err := os.Stat(uploadDir); err == nil {
		files, err := os.ReadDir(uploadDir)
		if err == nil {
			for _, f := range files {
				if !f.IsDir() {
					filesList = append(filesList, f.Name())
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   filesList,
	})
}

// DeleteUploadedFile deletes a specific uploaded file.
func DeleteUploadedFile(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	filename := c.Param("filename")

	// Clean filename to prevent path traversal
	filename = filepath.Base(filename)

	filePath := filepath.Join("uploads", "user_"+strconv.FormatUint(uint64(userID), 10), filename)

	if err := os.Remove(filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "File deleted successfully",
	})
}
