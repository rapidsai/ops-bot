resource "aws_cloudwatch_log_group" "probot_handler" {
  name              = "/aws/lambda/ops-bot-handleProbot"
  retention_in_days = 60
}

resource "aws_cloudwatch_log_group" "authorizer" {
  name              = "/aws/lambda/ops-bot-authorizerFn"
  retention_in_days = 60
}
