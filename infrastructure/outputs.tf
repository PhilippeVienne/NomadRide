output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.cdn.domain_name
  description = "The domain name of the CloudFront distribution"
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.cdn.id
  description = "The ID of the CloudFront distribution"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.frontend.id
  description = "The name of the S3 bucket hosting frontend files"
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.backend.repository_url
  description = "The URL of the ECR repository for the backend image"
}

output "api_gateway_endpoint" {
  value       = aws_apigatewayv2_api.api.api_endpoint
  description = "The direct endpoint URL of the API Gateway"
}
