resource "aws_lambda_function" "probot_handler" {
  depends_on    = [aws_cloudwatch_log_group.probot_handler]
  s3_bucket     = data.aws_s3_bucket.deployment.id
  s3_key        = "probot-${var.deployment_version}.zip"
  function_name = "ops-bot-${var.environment}-handleProbot"
  role          = aws_iam_role.lambda_role.arn
  handler       = "dist/probot.handler"
  runtime       = "nodejs18.x"
  timeout       = 900
  memory_size   = 1024

  environment {
    variables = {
      NODE_ENV       = var.environment
      LOG_FORMAT     = "json"
      LOG_LEVEL      = "debug"
      APP_ID         = var.app_id
      WEBHOOK_SECRET = var.webhook_secret
      PRIVATE_KEY    = var.private_key
      GPUTESTER_PAT  = var.gputester_pat
    }
  }

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = true
  }
}

resource "aws_lambda_function" "authorizer" {
  depends_on    = [aws_cloudwatch_log_group.authorizer]
  s3_bucket     = data.aws_s3_bucket.deployment.id
  s3_key        = "authorizer-${var.deployment_version}.zip"
  function_name = "ops-bot-${var.environment}-authorizerFn"
  role          = aws_iam_role.lambda_role.arn
  handler       = "dist/authorizer.handler"
  runtime       = "nodejs18.x"
  memory_size   = 1024

  environment {
    variables = {
      probotFnName = aws_lambda_function.probot_handler.function_name
    }
  }

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = true
  }
}
