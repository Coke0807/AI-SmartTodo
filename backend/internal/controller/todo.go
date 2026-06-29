package controller

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/Coke0807/AI-SmartTodo/backend/internal/model"
	"github.com/Coke0807/AI-SmartTodo/backend/internal/repository"
	"github.com/Coke0807/AI-SmartTodo/backend/internal/service"
	"github.com/Coke0807/AI-SmartTodo/backend/pkg/pb"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CreateTodoReq struct {
	Title         string          `json:"title" binding:"required"`
	Description   string          `json:"description"`
	Priority      string          `json:"priority"`
	EstimatedTime string          `json:"estimatedTime"`
	DueDate       string          `json:"dueDate"`
	AiGenerated   bool            `json:"aiGenerated"`
	SubTasks      []CreateSubTask `json:"subTasks"`
}

type CreateSubTask struct {
	Title     string `json:"title"`
	Completed bool   `json:"completed"`
}

type UpdateTodoReq struct {
	Title         *string         `json:"title"`
	Description   *string         `json:"description"`
	Completed     *bool           `json:"completed"`
	Priority      *string         `json:"priority"`
	EstimatedTime *string         `json:"estimatedTime"`
	DueDate       *string         `json:"dueDate"`
	SubTasks      []UpdateSubTask `json:"subTasks"`
}

type UpdateSubTask struct {
	ID        uint   `json:"id"`
	Title     string `json:"title"`
	Completed bool   `json:"completed"`
}

type AiConfig struct {
	Mode          string `json:"mode"`
	LocalEndpoint string `json:"localEndpoint"`
	CloudEndpoint string `json:"cloudEndpoint"`
	ApiKey        string `json:"apiKey"`
	ModelLocal    string `json:"modelLocal"`
	ModelCloud    string `json:"modelCloud"`
}

type AiSplitReq struct {
	Title       string    `json:"title" binding:"required"`
	Description string    `json:"description"`
	Config      *AiConfig `json:"config"`
}

// GetTodos returns all todos for the current user.
func GetTodos(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var todos []model.Todo
	// Why: Use GORM Preload to load subtasks in a single query block.
	if err := repository.DB.Preload("SubTasks").Where("user_id = ?", userID).Order("created_at desc").Find(&todos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch todos"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   todos,
	})
}

// CreateTodo creates a new todo and optional subtasks.
func CreateTodo(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var req CreateTodoReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	todo := model.Todo{
		UserID:        userID,
		Title:         req.Title,
		Description:   req.Description,
		Priority:      req.Priority,
		EstimatedTime: req.EstimatedTime,
		DueDate:       req.DueDate,
		AiGenerated:   req.AiGenerated,
	}

	// Map subtasks
	if len(req.SubTasks) > 0 {
		todo.SubTasks = make([]model.SubTask, len(req.SubTasks))
		for i, st := range req.SubTasks {
			todo.SubTasks[i] = model.SubTask{
				Title:     st.Title,
				Completed: st.Completed,
			}
		}
	}

	if err := repository.DB.Create(&todo).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create todo"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data":   todo,
	})
}

// UpdateTodo updates an existing todo and its subtasks.
func UpdateTodo(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	todoIDStr := c.Param("id")

	todoID, err := strconv.Atoi(todoIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid todo ID"})
		return
	}

	var todo model.Todo
	if err := repository.DB.Where("id = ? AND user_id = ?", todoID, userID).First(&todo).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
		return
	}

	var req UpdateTodoReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields if provided
	if req.Title != nil {
		todo.Title = *req.Title
	}
	if req.Description != nil {
		todo.Description = *req.Description
	}
	if req.Completed != nil {
		todo.Completed = *req.Completed
	}
	if req.Priority != nil {
		todo.Priority = *req.Priority
	}
	if req.EstimatedTime != nil {
		todo.EstimatedTime = *req.EstimatedTime
	}
	if req.DueDate != nil {
		todo.DueDate = *req.DueDate
	}

	// Transaction to update both main todo and subtasks safely
	err = repository.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&todo).Error; err != nil {
			return err
		}

		// Update subtask states
		for _, stReq := range req.SubTasks {
			if err := tx.Model(&model.SubTask{}).Where("id = ? AND todo_id = ?", stReq.ID, todo.ID).
				Updates(map[string]interface{}{"completed": stReq.Completed, "title": stReq.Title}).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update todo"})
		return
	}

	// Reload with subtasks
	repository.DB.Preload("SubTasks").First(&todo, todo.ID)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   todo,
	})
}

// DeleteTodo deletes a todo item (cascading subtasks automatic by constraint).
func DeleteTodo(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	todoIDStr := c.Param("id")

	todoID, err := strconv.Atoi(todoIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid todo ID"})
		return
	}

	var todo model.Todo
	if err := repository.DB.Where("id = ? AND user_id = ?", todoID, userID).First(&todo).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
		return
	}

	if err := repository.DB.Delete(&todo).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete todo"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Todo deleted successfully",
	})
}

// GetTodoStats returns aggregated statistics for the dashboard.
func GetTodoStats(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var todos []model.Todo
	if err := repository.DB.Preload("SubTasks").Where("user_id = ?", userID).Find(&todos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stats"})
		return
	}

	total := len(todos)
	completed := 0
	p0Count := 0
	p1Count := 0
	p2Count := 0
	totalSubTasks := 0
	completedSubTasks := 0
	aiGenerated := 0

	for _, t := range todos {
		if t.Completed {
			completed++
		}
		switch t.Priority {
		case "P0":
			p0Count++
		case "P1":
			p1Count++
		case "P2":
			p2Count++
		}
		if t.AiGenerated {
			aiGenerated++
		}
		for _, st := range t.SubTasks {
			totalSubTasks++
			if st.Completed {
				completedSubTasks++
			}
		}
	}

	completionRate := 0
	if total > 0 {
		completionRate = completed * 100 / total
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"total":             total,
			"completed":         completed,
			"pending":           total - completed,
			"completionRate":    completionRate,
			"p0Count":           p0Count,
			"p1Count":           p1Count,
			"p2Count":           p2Count,
			"totalSubTasks":     totalSubTasks,
			"completedSubTasks": completedSubTasks,
			"aiGenerated":       aiGenerated,
		},
	})
}

// AiSplit calls the Python AI service via gRPC to split a task.
func AiSplit(c *gin.Context) {
	var req AiSplitReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if service.AIClient == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service is currently unavailable"})
		return
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

	// Call gRPC service with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	resp, err := service.AIClient.SplitTask(ctx, &pb.SplitTaskRequest{
		Title:       req.Title,
		Description: req.Description,
		Config:      protoConfig,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to call AI service: " + err.Error()})
		return
	}

	// Map gRPC subtasks to Gin response format
	subTasks := make([]gin.H, len(resp.SubTasks))
	for i, st := range resp.SubTasks {
		subTasks[i] = gin.H{
			"title":     st.Title,
			"completed": st.Completed,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"title":         resp.Title,
			"description":   resp.Description,
			"priority":      resp.Priority,
			"estimatedTime": resp.EstimatedTime,
			"subTasks":      subTasks,
		},
	})
}
