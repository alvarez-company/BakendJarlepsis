# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create logs directory
RUN mkdir -p logs

# Documentación: Cloud Run inyecta PORT (p. ej. 8080); local sin PORT usa 4100 en main.ts.
EXPOSE 8080 4100

# Healthcheck: mismo puerto que process.env.PORT en runtime (p. ej. 8080 en Cloud Run).
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD node -e "const p=process.env.PORT||'4100';require('http').get('http://127.0.0.1:'+p+'/api/v1/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Start the application
CMD ["node", "dist/main"]