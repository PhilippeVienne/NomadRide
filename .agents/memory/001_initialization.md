# Project Initialization State - 2026-03-21

## 🛠️ Environment
- **Node.js**: v24.14.0.
- **Package Manager**: npm (used for Expo initialization).

## 🏗️ Infrastructure
- **IaC**: Terraform 1.10+ (required for S3 native locking).
- **AWS Provider**: v6.37.0.
- **Backend State**: S3 with native locking (`use_lockfile = true`) in `eu-west-3`.

## 📱 Mobile App
- **Framework**: Expo (React Native).
- **Template**: `blank-typescript`.
- **Target**: Android (Primary), iOS (Supported).

## 📡 API
- **Definition**: OpenAPI 3.0.3 in `backend/openapi/nomad.yaml`.
- **Service**: AWS API Gateway.
