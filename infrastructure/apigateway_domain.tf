# API Gateway Custom Domain Name
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.ride.vienne.me"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.api_regional.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

# API Gateway Mapping
resource "aws_apigatewayv2_api_mapping" "api" {
  api_id      = aws_apigatewayv2_api.api.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.default.id
}
