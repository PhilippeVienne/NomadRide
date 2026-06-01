# Agent Rules & Guidelines 📜

These rules apply to all AI agents interacting with the NomadRide codebase.

## 🧠 Continuous Learning & Memory

- **Post-Interaction Reflection**: After any significant interaction or task completion, evaluate if new knowledge about the project's architecture, patterns, or specific logic has been acquired.
- **Memory Storage**: Store these "learnings" in `.agents/memory/`. Each entry should be concise and focused.
- **Instruction Level**: Information stored in `.agents/memory/` should be considered as **low-level instructions** that take precedence over general defaults but remain secondary to the core project mandates.

## 📡 API Governance

- **Traceability**: No "ghost" API calls. Every external integration must have a corresponding definition file in `.agents/apis/`.
- **Documentation**: If an API is implemented, update the corresponding module documentation in `docs/`.

## 🏗️ Infrastructure & Deployment

- **IaC Engine**: **Terraform** is the mandatory tool for all infrastructure changes.
- **State Management**: Use **S3** for the backend state with **S3 native locking**. Do NOT use DynamoDB for state locking.
- **API Definition**: The source of truth for the API is `backend/openapi/nomad.yaml`. Any modification to the API must reflect in this file.
- **Image Registry**: Use **GHCR** for storing images, with the recommendation to clone/sync to **AWS ECR** for production Lambda deployments.
