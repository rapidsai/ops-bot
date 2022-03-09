import {
  createLambdaFunction,
  createProbot,
} from "@probot/adapter-aws-lambda-serverless";
import app from "./index";

export const probot = createLambdaFunction(app, {
  probot: createProbot(),
});
