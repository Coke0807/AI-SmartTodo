# Stage 1: Build React app
# Use Node.js 24 LTS (latest long-term support)
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm and disable supply-chain age verification for Docker builds
RUN npm install -g pnpm && pnpm config set minimum-release-age 0

# Copy package files and lockfiles
COPY package.json pnpm-lock.yaml tsconfig*.json vite.config.ts index.html ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source files and assets
COPY src ./src
COPY public ./public

# Build the project
RUN pnpm run build

# Stage 2: Serve static files via Nginx (stable branch pinned)
FROM nginx:stable-alpine

# Copy custom Nginx configuration for proxying API requests
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
