# Transition to PWA & Website Architecture - 2026-05-31

## 🏛️ Architecture Decision
- **Shift:** Replaced Expo-based React Native codebase with a Progressive Web App (PWA) and website.
- **Frontend Stack:** Vite + React + TypeScript + Vanilla CSS.
- **Backend CORS:** Enabled CORS middleware on the Hono backend to allow web browser requests.

## 📡 API Connection
- **Endpoint Configuration:** Managed inside `app/src/config.ts`, utilizing Vite's `import.meta.env` system with a fallback to `http://localhost:8080`.
- **CORS Handling:** Backend uses Hono's `cors()` middleware.

## ⚙️ Offline Capability (PWA)
- **Manifest:** Defined in `app/public/manifest.json`.
- **Service Worker:** Custom service worker `app/public/sw.js` implements:
  - Cache-first strategy for static assets.
  - Network-first strategy for dynamic `/api/` endpoints to handle price monitoring with offline fallback.
- **Icons:** Modern SVG format icons (`icon.svg` & maskable `icon-maskable.svg`) with standard/safe zones used to scale cleanly without resolution degradation.

## 🎨 UI/UX Design System
- **Contrast:** Default dark mode with high contrast neon highlights (green `#00ff66` and orange `#ff5500`).
- **Glove-Friendly Paradigm:** Form elements, buttons, and nav items enforce a minimum height/width tap target size of `56px` to allow thick motorcycle glove navigation.
- **Aesthetic:** Curated typography (Orbitron + Outfit) and subtle card transition micro-animations.
