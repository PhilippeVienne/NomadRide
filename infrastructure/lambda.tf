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

# AWS Lambda Function defined as a Docker container image
resource "aws_lambda_function" "backend" {
  function_name = "${var.app_name}-${var.environment}-backend"
  role          = aws_iam_role.lambda_exec.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.backend.repository_url}:latest"

  timeout     = 15 # 15 seconds max timeout
  memory_size = 512 # 512MB RAM for Hono JS app (well-balanced for cold starts and cost)

  image_config {
    # Override CMD to invoke the handler function from dist/lambda.js
    command = ["dist/lambda.handler"]
  }

  environment {
    variables = {
      NODE_ENV = var.environment
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
