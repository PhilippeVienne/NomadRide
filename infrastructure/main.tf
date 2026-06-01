terraform {
  required_version = ">= 1.10.0"

  backend "s3" {
    bucket         = "nomadride-terraform-state"
    key            = "state/terraform.tfstate"
    region         = "eu-west-3"
    use_lockfile   = true # Use S3 native locking (available in Terraform 1.10+)
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.37.0"
    }
  }
}

provider "aws" {
  region = "eu-west-3"
}
