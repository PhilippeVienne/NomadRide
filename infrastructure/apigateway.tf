# API Gateway HTTP API (v2)
resource "aws_apigatewayv2_api" "api" {
  name          = "${var.app_name}-${var.environment}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"] # CloudFront will proxy API, but this is a fallback
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
  }
}

# Lambda Integration
resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"

  connection_type      = "INTERNET"
  description          = "Lambda Integration for Hono backend"
  integration_method   = "POST"
  integration_uri      = aws_lambda_function.backend.invoke_arn
  payload_format_version = "2.0"
}

# Route everything to the Hono Lambda integration
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# API Gateway Stage with Auto Deploy enabled
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
}

# Permission to allow API Gateway to invoke Lambda
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"

  # Limit permission to this API Gateway
  source_arn = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
