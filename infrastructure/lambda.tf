# IAM Role for Lambda Execution
resource "aws_iam_role" "lambda_exec" {
  name = "${var.app_name}-${var.environment}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Attach basic execution role policy (for logging to CloudWatch)
resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${aws_lambda_function.backend.function_name}"
  retention_in_days = 7 # Keep logs for 7 days (cost optimization)
}

# SSM Parameter to track the latest deployed Docker image URI
resource "aws_ssm_parameter" "backend_image" {
  name        = "/nomadride/${var.environment}/backend/image_uri"
  type        = "String"
  value       = "${aws_ecr_repository.backend.repository_url}:latest"

  lifecycle {
    ignore_changes = [
      value,
    ]
  }
}

# AWS Lambda Function defined as a Docker container image
resource "aws_lambda_function" "backend" {
  function_name = "${var.app_name}-${var.environment}-backend"
  role          = aws_iam_role.lambda_exec.arn
  package_type  = "Image"
  image_uri     = aws_ssm_parameter.backend_image.value

  timeout     = 15 # 15 seconds max timeout
  memory_size = 512 # 512MB RAM for Hono JS app (well-balanced for cold starts and cost)

  image_config {
    # Override CMD to invoke the handler function from dist/lambda.js
    command = ["dist/lambda.handler"]
  }

  environment {
    variables = {
      NODE_ENV       = var.environment
      STORAGE_MODE   = "S3"
      S3_BUCKET_NAME = aws_s3_bucket.weather_cache.id
    }
  }

  tags = {
    Environment = var.environment
  }

  # Prevent Terraform from failing/overwriting if the image hasn't been built/pushed yet or updated via CI/CD
  lifecycle {
    ignore_changes = [
      image_uri,
    ]
  }
}

# IAM policy allowing Lambda to access the weather cache bucket
resource "aws_iam_policy" "lambda_s3_weather" {
  name        = "${var.app_name}-${var.environment}-lambda-s3-weather-policy"
  description = "Allows Lambda backend to read and write forecast slices in the S3 weather cache bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.weather_cache.arn,
          "${aws_s3_bucket.weather_cache.arn}/*"
        ]
      }
    ]
  })
}

# Attach S3 policy to Lambda execution role
resource "aws_iam_role_policy_attachment" "lambda_s3_weather" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_s3_weather.arn
}
