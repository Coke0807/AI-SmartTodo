# Use official Python image as base (3.13 = latest well-established stable)
FROM python:3.13-slim

# Copy uv binary from official astral-sh/uv image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy dependency manifests
COPY pyproject.toml uv.lock ./

# Install dependencies using uv (without installing the project package itself)
RUN uv sync --frozen --no-install-project --no-dev

# Copy application source code and generated stubs
COPY . .

# Expose FastAPI HTTP (8000) and gRPC (50051) ports
EXPOSE 8000 50051

# Start the dual-mode server via uv environment
CMD ["uv", "run", "python", "main.py"]
