resource "aws_api_gateway_rest_api" "ops_bot" {
  name = "ops-bot-${var.environment}"
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.ops_bot.id
  parent_id   = aws_api_gateway_rest_api.ops_bot.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.ops_bot.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "POST"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.ops_bot.id
}

resource "aws_api_gateway_authorizer" "ops_bot" {
  name                   = "ops-bot-authorizer"
  rest_api_id            = aws_api_gateway_rest_api.ops_bot.id
  authorizer_uri         = aws_lambda_function.authorizer.invoke_arn
  authorizer_credentials = aws_iam_role.api_gateway_authorizer.arn
  type                   = "REQUEST"
}

resource "aws_api_gateway_integration" "lambda" {
  rest_api_id = aws_api_gateway_rest_api.ops_bot.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.probot_handler.invoke_arn
}

resource "aws_api_gateway_deployment" "ops_bot" {
  rest_api_id = aws_api_gateway_rest_api.ops_bot.id
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy.id,
      aws_api_gateway_integration.lambda.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "ops_bot" {
  deployment_id = aws_api_gateway_deployment.ops_bot.id
  rest_api_id   = aws_api_gateway_rest_api.ops_bot.id
  stage_name    = var.environment
}
