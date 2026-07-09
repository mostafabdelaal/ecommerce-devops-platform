# -----------------------------------------------------------------------------
# Multi-stage build for the CloudMart backend.
# Stage 1 installs production dependencies; stage 2 copies only what is needed
# into a slim runtime image, keeping the final image small.
# -----------------------------------------------------------------------------

# ---- Stage 1: dependencies ----
FROM node:20-alpine AS deps

WORKDIR /app

# Install only production dependencies using a reproducible install.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

# ---- Stage 2: runtime ----
FROM node:20-alpine AS runtime

# Small, security-conscious defaults.
ENV NODE_ENV=production
WORKDIR /app

# Copy installed modules from the deps stage and the application source.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server.js ./

# Run as the built-in unprivileged "node" user rather than root.
USER node

EXPOSE 3000

# Container-level healthcheck hitting the DB-aware /health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
