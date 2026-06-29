# Stage 1: Build Go binary
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git ca-certificates

# Copy dependency manifests
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY cmd ./cmd
COPY internal ./internal
COPY pkg ./pkg

# Build statically linked binary with optimization flags
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o bin/server cmd/server/main.go

# Stage 2: Minimal runtime image
FROM alpine:3.24

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create uploads directory for RAG document storage
RUN mkdir -p /app/uploads

# Copy compiled binary
COPY --from=builder /app/bin/server .

EXPOSE 8080

CMD ["./server"]
