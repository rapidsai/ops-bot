resource "aws_lambda_function" "probot_handler" {
  depends_on       = [aws_cloudwatch_log_group.probot_handler]
  filename         = "../probot.zip"
  source_code_hash = filebase64sha256("../probot.zip")
  function_name    = "ops-bot-handleProbot"
  role             = aws_iam_role.lambda_role.arn
  handler          = "dist/probot.handler"
  runtime          = "nodejs18.x"
  timeout          = 900
  memory_size      = 1024

  environment {
    variables = {
      NODE_ENV   = "production"
      LOG_FORMAT = "json"
      LOG_LEVEL  = "debug"
      NODE_OPTIONS = "--enable-source-maps"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lambda_function" "authorizer" {
  depends_on       = [aws_cloudwatch_log_group.authorizer]
  filename         = "../authorizer.zip"
  source_code_hash = filebase64sha256("../authorizer.zip")
  function_name    = "ops-bot-authorizerFn"
  role             = aws_iam_role.lambda_role.arn
  handler          = "dist/authorizer.handler"
  runtime          = "nodejs18.x"
  memory_size      = 1024

  environment {
    variables = {
      probotFnName = aws_lambda_function.probot_handler.function_name
      NODE_OPTIONS = "--enable-source-maps"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lambda_permission" "api_gw_resource_policy" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.probot_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.ops_bot.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gw_authorizer_policy" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.ops_bot.execution_arn}/*/*"
}
