variable "aws_region" {
  type        = string
  description = "AWS region for the resources"
  default     = "eu-west-3"
}

variable "environment" {
  type        = string
  description = "Deployment environment (e.g., dev, staging, production)"
  default     = "production"
}

variable "app_name" {
  type        = string
  description = "Application name prefix for resource naming"
  default     = "nomadride"
}

variable "enable_waf" {
  type        = bool
  description = "Whether to enable AWS WAF for CloudFront (incurs monthly charges)"
  default     = false
}
