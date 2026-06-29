package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/Coke0807/AI-SmartTodo/backend/internal/config"
	"github.com/Coke0807/AI-SmartTodo/backend/internal/controller"
	"github.com/Coke0807/AI-SmartTodo/backend/internal/middleware"
	"github.com/Coke0807/AI-SmartTodo/backend/internal/repository"
	"github.com/Coke0807/AI-SmartTodo/backend/internal/service"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize configuration
	config.LoadConfig()

	// Initialize database connection & models auto-migration
	repository.InitDB()

	// Initialize AI gRPC client
	service.InitAIClient()
	defer service.CloseAIClient()

	// Set Gin mode
	gin.SetMode(config.AppConfig.GinMode)

	// Create router
	r := gin.Default()

	// Basic CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	// Register basic health-check/ping route
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
			"status":  "healthy",
		})
	})

	// API Routing Group
	api := r.Group("/api")
	{
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", controller.Register)
			auth.POST("/login", controller.Login)
			auth.GET("/me", middleware.AuthRequired(), controller.GetMe)
			auth.PUT("/profile", middleware.AuthRequired(), controller.UpdateProfile)
			auth.PUT("/password", middleware.AuthRequired(), controller.ChangePassword)
			auth.GET("/ai-config", middleware.AuthRequired(), controller.GetAiConfig)
			auth.PUT("/ai-config", middleware.AuthRequired(), controller.UpdateAiConfig)
		}
		// Todo routes (protected by AuthRequired middleware)
		todos := api.Group("/todos")
		todos.Use(middleware.AuthRequired())
		{
			todos.GET("", controller.GetTodos)
			todos.GET("/stats", controller.GetTodoStats)
			todos.POST("", controller.CreateTodo)
			todos.PUT("/:id", controller.UpdateTodo)
			todos.DELETE("/:id", controller.DeleteTodo)
			todos.POST("/ai-split", controller.AiSplit)
		}

		// AI and RAG routes (protected by AuthRequired middleware)
		aiGroup := api.Group("/ai")
		aiGroup.Use(middleware.AuthRequired())
		{
			aiGroup.POST("/chat", controller.Chat)
			aiGroup.POST("/chat/stream", controller.ChatStream)
			aiGroup.POST("/rag", controller.RAGQuery)
			aiGroup.POST("/upload", controller.UploadFile)
			aiGroup.GET("/files", controller.GetUploadedFiles)
			aiGroup.DELETE("/files/:filename", controller.DeleteUploadedFile)
		}
	}

	// Start server
	addr := fmt.Sprintf(":%s", config.AppConfig.Port)
	log.Printf("Starting Gin HTTP server on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
