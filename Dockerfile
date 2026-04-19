FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production

# Copy application source
COPY . .

# Security: run as non-root user
USER node

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/healthz').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"

CMD ["node", "server.js"]
