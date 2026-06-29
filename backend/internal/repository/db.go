package repository

import (
	"fmt"
	"log"

	"github.com/Coke0807/AI-SmartTodo/backend/internal/config"
	"github.com/Coke0807/AI-SmartTodo/backend/internal/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// DB is the global database instance.
var DB *gorm.DB

// InitDB initializes PostgreSQL connection using GORM.
func InitDB() {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Shanghai",
		config.AppConfig.DBHost,
		config.AppConfig.DBUser,
		config.AppConfig.DBPassword,
		config.AppConfig.DBName,
		config.AppConfig.DBPort,
		config.AppConfig.DBSslMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}

	log.Println("Database connection successfully established")

	// Automigrate tables
	err = db.AutoMigrate(&model.User{}, &model.Todo{}, &model.SubTask{})
	if err != nil {
		log.Fatalf("Failed to run database migrations: %v", err)
	}

	log.Println("Database migration completed successfully")
	DB = db
}
