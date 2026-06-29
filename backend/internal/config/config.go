package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all configuration values for the application.
type Config struct {
	Port              string
	GinMode           string
	DBHost            string
	DBPort            string
	DBUser            string
	DBPassword        string
	DBName            string
	DBSslMode         string
	JWTSecret         string
	JWTExpiryHours    int
	AIServiceGRPCAddr string
	AIServiceHTTPPort string
}

// AppConfig is the global configuration instance.
var AppConfig *Config

// LoadConfig loads configurations from environment and .env.local files.
func LoadConfig() {
	// Attempt to load .env.local file, but do not fail if it's missing (e.g. in containerized env)
	if err := godotenv.Load(".env.local"); err != nil {
		log.Println("No .env.local file found, relying on system environment variables")
	}

	AppConfig = &Config{
		Port:              getEnv("PORT", "8080"),
		GinMode:           getEnv("GIN_MODE", "debug"),
		DBHost:            getEnv("DB_HOST", "127.0.0.1"),
		DBPort:            getEnv("DB_PORT", "5432"),
		DBUser:            getEnv("DB_USER", "postgres"),
		DBPassword:        getEnv("DB_PASSWORD", "postgres"),
		DBName:            getEnv("DB_NAME", "smarttodo"),
		DBSslMode:         getEnv("DB_SSLMODE", "disable"),
		JWTSecret:         getEnv("JWT_SECRET", "default_secret_key"),
		JWTExpiryHours:    getEnvAsInt("JWT_EXPIRY_HOURS", 24),
		AIServiceGRPCAddr: getEnv("AI_SERVICE_GRPC_ADDR", "127.0.0.1:50051"),
		AIServiceHTTPPort: getEnv("AI_SERVICE_HTTP_PORT", "8000"),
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}
