variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "app_id" {
  description = "GitHub App ID"
  type        = string
  sensitive   = true
}

variable "webhook_secret" {
  description = "GitHub Webhook Secret"
  type        = string
  sensitive   = true
}

variable "private_key" {
  description = "GitHub App Private Key"
  type        = string
  sensitive   = true
}

variable "gputester_pat" {
  description = "GPU Tester PAT"
  type        = string
  sensitive   = true
}

variable "deployment_version" {
  description = "Version identifier for Lambda deployment packages"
  type        = string
}
