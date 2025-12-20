FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backend

# Copy node_modules from deps
COPY --from=deps --chown=backend:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=backend:nodejs . .

# Make entrypoint script executable
RUN chmod +x docker-entrypoint.sh

USER backend

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
