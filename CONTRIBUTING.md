# Contributing

Any new functionality should be introduced as a new plugin in the [src/plugins](./src/plugins) directory. New plugins should make use of the shared `featureIsDisabled` function so that repositories can disable the feature if they desire. New plugins should also have an entry added in [config.ts](./src/config.ts)

## Making Infrastructure Changes

The project uses Terraform to manage AWS infrastructure. The configuration files are located in the `terraform/` directory.

### Structure

- `main.tf`: Provider configuration and backend setup
- `lambda.tf`: Lambda function definitions
- `iam.tf`: IAM roles and policies
- `api_gateway.tf`: API Gateway configuration
- `cloudwatch.tf`: CloudWatch log groups
- `variables.tf`: Input variables
- `outputs.tf`: Output values

### Testing Changes

1. Make your changes to the Terraform files
2. Run `terraform fmt` to ensure consistent formatting
3. Run `terraform validate` to check for configuration errors
4. Create a PR - the GitHub Actions workflow will automatically:
   - Check formatting
   - Validate configuration
   - Generate and post a plan to the PR

### Deployment

Infrastructure changes are automatically deployed when merged to `main`. The deployment:
- Packages and uploads Lambda functions to S3
- Applies Terraform changes with the new configuration
