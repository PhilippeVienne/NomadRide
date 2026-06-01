# Lookup the existing Route53 hosted zone
data "aws_route53_zone" "main" {
  name         = "ride.vienne.me."
  private_zone = false
}

# Create ACM certificate in us-east-1 (required for CloudFront)
resource "aws_acm_certificate" "cert" {
  provider          = aws.us_east_1
  domain_name       = "ride.vienne.me"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Environment = var.environment
  }
}

# Create DNS validation records in Route53
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Validate ACM Certificate
resource "aws_acm_certificate_validation" "cert" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Route53 Alias record for A (IPv4) pointing to CloudFront
resource "aws_route53_record" "a" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = ""
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

# Route53 Alias record for AAAA (IPv6) pointing to CloudFront
resource "aws_route53_record" "aaaa" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = ""
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

# Create regional ACM certificate in eu-west-3 for API Gateway Custom Domain
resource "aws_acm_certificate" "api_regional" {
  domain_name       = "api.ride.vienne.me"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Environment = var.environment
  }
}

# Create DNS validation records for regional certificate
resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api_regional.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Validate Regional Certificate
resource "aws_acm_certificate_validation" "api_regional" {
  certificate_arn         = aws_acm_certificate.api_regional.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
}

# Route53 Alias records for api.ride.vienne.me pointing to API Gateway target
resource "aws_route53_record" "api_a" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api_aaaa" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api"
  type    = "AAAA"

  alias {
    name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
