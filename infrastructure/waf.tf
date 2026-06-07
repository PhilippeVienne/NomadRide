# AWS WAFv2 Web ACL for CloudFront (Must be created in us-east-1)
resource "aws_wafv2_web_acl" "cloudfront" {
  count    = var.enable_waf ? 1 : 0
  provider = aws.us_east_1
  name     = "${var.app_name}-${var.environment}-waf"
  scope    = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rule 1: Geoblocking on API (Only FR allowed for /api/* and /health)
  rule {
    name     = "GeoBlockNonFrenchAPI"
    priority = 1
    action {
      block {}
    }
    statement {
      and_statement {
        statement {
          or_statement {
            statement {
              byte_match_statement {
                search_string = "/api/"
                field_to_match {
                  uri_path {}
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
                positional_constraint = "STARTS_WITH"
              }
            }
            statement {
              byte_match_statement {
                search_string = "/health"
                field_to_match {
                  uri_path {}
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
                positional_constraint = "EXACTLY"
              }
            }
          }
        }
        statement {
          not_statement {
            statement {
              geo_match_statement {
                country_codes = ["FR"]
              }
            }
          }
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoBlockNonFrenchAPI"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: Strict IP Rate Limit on API (100 requests per 5 minutes per IP)
  rule {
    name     = "APIRateLimit"
    priority = 2
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = 100
        aggregate_key_type = "IP"

        scope_down_statement {
          or_statement {
            statement {
              byte_match_statement {
                search_string = "/api/"
                field_to_match {
                  uri_path {}
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
                positional_constraint = "STARTS_WITH"
              }
            }
            statement {
              byte_match_statement {
                search_string = "/health"
                field_to_match {
                  uri_path {}
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
                positional_constraint = "EXACTLY"
              }
            }
          }
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "APIRateLimit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.app_name}-${var.environment}-waf-metrics"
    sampled_requests_enabled   = true
  }

  tags = {
    Environment = var.environment
  }
}
