package controller

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// Why: Unit tests verify controller input binding logic in isolation.
// Database-dependent tests require integration test setup and are out of scope here.

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	return r
}

func TestRegisterReqBinding(t *testing.T) {
	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
	}{
		{
			name:       "empty body returns 400",
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing password returns 400",
			body:       map[string]any{"username": "testuser"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "username too short returns 400",
			body:       map[string]any{"username": "ab", "password": "123456"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "password too short returns 400",
			body:       map[string]any{"username": "testuser", "password": "12345"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "valid body passes binding",
			body:       map[string]any{"username": "testuser", "password": "123456"},
			wantStatus: http.StatusOK,
		},
		{
			name:       "valid body with email passes binding",
			body:       map[string]any{"username": "testuser", "password": "123456", "email": "test@example.com"},
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid email returns 400",
			body:       map[string]any{"username": "testuser", "password": "123456", "email": "not-an-email"},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := setupTestRouter()
			// Why: Test only the binding logic by using a handler that just validates the request.
			r.POST("/test", func(c *gin.Context) {
				var req RegisterReq
				if err := c.ShouldBindJSON(&req); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"username": req.Username, "email": req.Email})
			})

			body, _ := json.Marshal(tt.body)
			req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("got status %d, want %d; body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestLoginReqBinding(t *testing.T) {
	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
	}{
		{
			name:       "empty body returns 400",
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing password returns 400",
			body:       map[string]any{"username": "admin"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "valid body passes binding",
			body:       map[string]any{"username": "admin", "password": "secret123"},
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := setupTestRouter()
			r.POST("/test", func(c *gin.Context) {
				var req LoginReq
				if err := c.ShouldBindJSON(&req); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"ok": true})
			})

			body, _ := json.Marshal(tt.body)
			req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("got status %d, want %d; body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestChangePasswordReqBinding(t *testing.T) {
	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
	}{
		{
			name:       "empty body returns 400",
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "old password too short returns 400",
			body:       map[string]any{"oldPassword": "12345", "newPassword": "newpass1"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "valid body passes binding",
			body:       map[string]any{"oldPassword": "oldpass1", "newPassword": "newpass1"},
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := setupTestRouter()
			r.POST("/test", func(c *gin.Context) {
				var req ChangePasswordReq
				if err := c.ShouldBindJSON(&req); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"ok": true})
			})

			body, _ := json.Marshal(tt.body)
			req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("got status %d, want %d; body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}
