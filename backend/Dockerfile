# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Runtime
FROM public.ecr.aws/lambda/nodejs:22 AS runner

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy the bundled files
COPY --from=builder /app/dist ./dist

# Default to the handler
CMD ["dist/lambda.handler"]
