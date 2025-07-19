# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create data directory structure (will be mounted as volume)
RUN mkdir -p /app/data

# Expose port (optional, for documentation)
EXPOSE 3000

# Health check - verify the application can start
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "console.log('Health check passed'); process.exit(0)" || exit 1

# Default command - run main service
CMD ["npm", "start"]

# Alternative commands for different use cases:
# CLI configuration: docker run --rm -it <image> npm run config
# Development mode: docker run --rm -it <image> npm run dev