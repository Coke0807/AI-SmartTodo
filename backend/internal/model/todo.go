package model

import "time"

// Todo represents a user's main task.
type Todo struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	UserID        uint      `gorm:"index;not null" json:"userId"`
	Title         string    `gorm:"not null;size:255" json:"title"`
	Description   string    `gorm:"type:text" json:"description"`
	Completed     bool      `gorm:"default:false" json:"completed"`
	Priority      string    `gorm:"size:10;default:'P1'" json:"priority"`
	EstimatedTime string    `gorm:"size:100" json:"estimatedTime"`
	DueDate       string    `gorm:"size:50" json:"dueDate"`
	AiGenerated   bool      `gorm:"default:false" json:"aiGenerated"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	SubTasks      []SubTask `gorm:"constraint:OnDelete:CASCADE;" json:"subTasks"`
}

// SubTask represents a sub-item of a Todo.
type SubTask struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TodoID    uint      `gorm:"index;not null" json:"todoId"`
	Title     string    `gorm:"not null;size:255" json:"title"`
	Completed bool      `gorm:"default:false" json:"completed"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
