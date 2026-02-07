# US Regulations MCP Server
# Multi-stage build for Azure Container Apps
#
# IMPORTANT: Always build for AMD64 (Azure platform requirement)
# Build command: docker buildx build --platform linux/amd64 -t <image> .

# Build stage
FROM --platform=linux/amd64 node:24-alpine AS builder

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --ignore-scripts

# Rebuild better-sqlite3 for this platform
RUN cd node_modules/better-sqlite3 && npm run build-release

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Production stage
FROM --platform=linux/amd64 node:24-alpine AS production

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Copy built artifacts BEFORE install
COPY --from=builder /app/dist ./dist

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts

# Rebuild better-sqlite3 for this platform
RUN cd node_modules/better-sqlite3 && npm run build-release

# Clean up build tools
RUN apk del python3 make g++ && \
    npm cache clean --force

# Security: create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy pre-built database
COPY data/regulations.db ./data/regulations.db

# Set ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Default: Start MCP HTTP server
# Override with SERVICE_TYPE=api for REST API
CMD ["sh", "-c", "if [ \"$SERVICE_TYPE\" = \"api\" ]; then node dist/rest-server.js; else node dist/http-server.js; fi"]
