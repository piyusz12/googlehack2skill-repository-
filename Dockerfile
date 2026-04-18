# ============================================
# VenueFlow — Docker Configuration for Cloud Run
# ============================================
# Multi-stage build for Google Cloud Run deployment
# @see https://cloud.google.com/run/docs/building/containers
# ============================================

FROM node:20-slim AS production

# Set working directory
WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application files
COPY . .

# Set environment variables for Google Cloud
ENV NODE_ENV=production
ENV PORT=8080
ENV GOOGLE_CLOUD_PROJECT=hack2skill-493718
ENV GOOGLE_CLOUD_REGION=europe-west1

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/healthz || exit 1

# Start the server
CMD ["node", "server.js"]
