# Backend Architecture Decision - 2026-03-21

## 🚀 Framework: Hono
- **Choice**: [Hono](https://hono.dev/)
- **Rationale**: Ultra-fast, lightweight, and standards-based (Fetch API). Designed for "Write Once, Run Anywhere" (WORA).
- **Portability**: Native support for AWS Lambda, Cloud Run, and Kubernetes via dedicated entry points (`lambda.ts` and `server.ts`).

## 🛠️ Tooling
- **Runtime**: Node.js 22+ (Alpine/Distroless).
- **Build System**: **Esbuild** for near-instant bundling and minification.
- **Testing**: **Vitest** for high-performance unit and integration testing.
- **Docker**: Multi-stage build producing a minimal runner image without `node_modules`.

## 📡 API Strategy
- **Entry Points**: 
    - `src/lambda.ts`: Optimized for AWS Lambda cold starts.
    - `src/server.ts`: Standard Node.js server for containerized environments.
- **Middleware**: Built-in Hono logger and standard middleware.
