package model

import "time"

// User represents the GORM schema for the user table.
type User struct {
	ID           uint   `gorm:"primaryKey" json:"id"`
	Username     string `gorm:"uniqueIndex;not null;size:100" json:"username"`
	Email        string `gorm:"size:200" json:"email"`
	PasswordHash string `gorm:"not null" json:"-"`
	// Why: Store AI model configuration as JSON string per user,
	// enabling cross-device and cross-session persistence.
	AiConfigJSON string    `gorm:"type:text;default:''" json:"-"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}
