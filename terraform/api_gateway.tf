resource "aws_api_gateway_rest_api" "ops_bot" {
  name = "ops-bot"
}

resource "aws_api_gateway_method" "root_post" {
  rest_api_id = aws_api_gateway_rest_api.ops_bot.id
  # resource_id   = aws_api_gateway_resource.proxy.id
  resource_id   = aws_api_gateway_rest_api.ops_bot.root_resource_id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda" {
  rest_api_id = aws_api_gateway_rest_api.ops_bot.id
  resource_id = aws_api_gateway_rest_api.ops_bot.root_resource_id
  http_method = aws_api_gateway_method.root_post.http_method
  credentials = aws_iam_role.api_gateway_authorizer.arn

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.authorizer.invoke_arn
}

resource "aws_api_gateway_deployment" "ops_bot" {
  rest_api_id = aws_api_gateway_rest_api.ops_bot.id
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_rest_api.ops_bot.root_resource_id,
      aws_api_gateway_method.root_post.id,
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
  stage_name    = "prod"
}
