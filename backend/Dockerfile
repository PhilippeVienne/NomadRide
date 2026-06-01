# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Runtime
# We use a distroless-like approach or minimal alpine for "quickest JS docker image"
# but keep alpine for debuggability as requested.
FROM node:22-alpine AS runner

WORKDIR /app

# We only need the bundled files, not node_modules!
# esbuild bundled everything into single files.
COPY --from=builder /app/dist ./dist

ENV PORT=8080
EXPOSE 8080

# Default to the standalone server (Cloud Run / K8s behavior)
# For Lambda, you would override the CMD/ENTRYPOINT to invoke the handler
CMD ["node", "dist/server.js"]
