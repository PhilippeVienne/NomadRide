# Mobile Architecture - 2026-03-21

## 📡 API Service Pattern
- **Pattern**: Dedicated `ApiService` class in `app/src/services/`.
- **Rationale**: Encapsulates fetch logic, error handling, and type safety, making the UI components cleaner and more focused on rendering.

## ⚙️ Configuration & Environment
- **Mechanism**: Use `EXPO_PUBLIC_` environment variables.
- **Config Store**: `app/src/config/index.ts` manages URLs and endpoints.
- **Build-time Support**: Environment variables can be injected during CI/CD or via `.env` files.
- **Fallback**: Local development fallback to `http://10.0.2.2:8080` (standard Android Emulator loopback).
