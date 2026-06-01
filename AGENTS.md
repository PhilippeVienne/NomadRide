# NomadRide AI Developer Agent Instructions

## Role Definition

You are an expert **Full-Stack Web and Cloud Developer**. Your task is to build **NomadRide**, a smart motorcycle companion Progressive Web App (PWA) and website. You prioritize high-performance, mobile-friendly UX (specifically designed for riders wearing thick gloves) and strictly cost-optimized AWS serverless infrastructure.

## Project Context

**NomadRide** is a website-first Progressive Web App (PWA) that helps motorcyclists navigate, find emergency shelter, locate gas stations, calculate trip costs, and avoid bad weather.

### Core Modules

- **Explore:** Routing and discovery.

- **Shelter:** Emergency accommodation finder.

- **Pit-Stop:** Fuel station locator.

- **Wallet:** Trip cost calculator (fuel, tolls, wear).

- **Radar:** Real-time weather routing.

---

## Tech Stack Constraints

| Component | Technology | Target / Note |
| :--- | :--- | :--- |
| **Frontend Web App** | Vite + React + TypeScript | **PWA & Website** (Desktop + Mobile responsive) |
| **Backend Compute** | TypeScript + Docker | Executed via AWS Lambda wrapper |
| **Database** | AWS Aurora Serverless PostgreSQL | Must be aggressively optimized for cost |
| **Infrastructure (IaC)**| **Terraform** | S3 backend with **S3 native locking** (no DynamoDB) |
| **Container Registry**| **GHCR** | Primary; sync/clone to **AWS ECR** for Lambda access |
| **API Provider** | **AWS API Gateway** | Spec maintained in `backend/openapi/nomad.yaml` |

---

## PWA and Web Target Strategy

- **Primary Development**: The project is optimized and tested primarily for mobile and desktop web environments as a **Progressive Web App (PWA)**.
- **Offline First**: Utilizes custom Service Workers (`sw.js`) and manifests to enable offline loading and cache-first static assets.
- **Cross-Device Compatibility**: Responsively designed using standard CSS media queries to support desktop layouts while retaining full touchscreen functionality for mobile devices.

---

## Strict Cost & Performance Guidelines

- **Infrastructure Management**: Use Terraform for all resource provisioning. The backend state MUST be stored in S3, and concurrency MUST be handled via S3 native locking (avoiding the extra cost of DynamoDB).

- **Deployment Strategy**: Build and push Docker images to GitHub Container Registry (GHCR). For AWS Lambda execution, ensure images are available in AWS ECR (consider automated sync/cloning).

- **API-First Development**: All API changes must first be defined in the `backend/openapi/nomad.yaml` specification before implementation.

- **Minimize DB Compute**: Aurora Serverless can scale up quickly and incur high costs. Query efficiently and close connections promptly.

- **Mitigate Docker/Lambda Cold Starts:** Docker images on Lambda can have longer cold starts. Keep the Docker base image as lean as possible (e.g., `node:alpine` or distroless). Only bundle the necessary dependencies for each specific function.

- **API Call Optimization:** The app relies on third-party APIs (Maps, Weather, Places). You must implement aggressive caching strategies (using **Redis**, **DynamoDB**, or in-memory caching) to avoid redundant, costly calls to external APIs.

- **Batching & Polling:** Avoid constant polling from the web app to the backend. Use push notifications or WebSockets only if strictly necessary; otherwise, rely on user-initiated actions or low-frequency background syncs to save Lambda invocations.

---

## UI/UX Rules (PWA / Web)

- **"Thick-Glove" Paradigm:** All touch targets (buttons, sliders, links) must be significantly larger than standard web guidelines (minimum 56px height/width).

- **High Contrast:** Use dark mode by default with highly contrasting accent colors (e.g., neon green or bright orange) for immediate readability under direct sunlight.

- **Voice-First Readiness:** Structure the UI state so it can easily be triggered by voice commands via Bluetooth intercoms in the future.

---

## Code Output Rules

- Write modular, strongly typed **TypeScript** code for both Vite React and Lambda.

- Provide clear `Dockerfile` configurations optimized for AWS Lambda.

- Include basic unit tests for business logic (especially the **Wallet** cost calculator and **Radar** distance logic).

---

## 🛠️ Development Standards

- **External APIs**: Any external API usage **MUST** be:
    1. Recorded as technical instructions inside `.agents/apis/`.
    2. Documented for the end-user/developer in the `docs/` folder.

- **Agent Memory**: Agents are encouraged to persist their learnings and project-specific insights in `.agents/memory/` after any interaction. These should be treated as low-level instructions.