output "api_gateway_url" {
  description = "Base URL for API Gateway stage"
  value       = "${aws_api_gateway_stage.ops_bot.invoke_url}/"
}
