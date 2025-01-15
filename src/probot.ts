/*
 * Copyright (c) 2022, NVIDIA CORPORATION.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  createLambdaFunction,
  createProbot,
} from "@probot/adapter-aws-lambda-serverless";
import app from "./index.ts";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { getPrivateKey } from "@probot/get-private-key";

// get the secrets here and add it to the createProbot function as overrides
const retreiveCredentials = async () => {
  const client = new SecretsManagerClient({
    region: "us-east-2",
    retryMode: "standard",
    maxAttempts: 3,
  });
  const input = {
    SecretId:
      "arn:aws:secretsmanager:us-east-2:279114543810:secret:lambda/ops-bot-handleProbot-qlVFbZ",
  };
  const command = new GetSecretValueCommand(input);
  const { SecretString } = await client.send(command);
  if (typeof SecretString !== "string") {
    throw new Error("Error getting secrets");
  }
  const obj = JSON.parse(SecretString) as {
    webhookSecret: string;
    privateKey: string;
    appId: number;
    gputesterPat: string;
  };
  
  process.env.GPUTESTER_PAT = obj.gputesterPat;

  return {
    secret: obj.webhookSecret,
    // This decodes an optionally base64-encoded private key
    privateKey: getPrivateKey({
      env: { PRIVATE_KEY: obj.privateKey },
    })!,
    appId: obj.appId,
  };
};

const { secret, privateKey, appId } = await retreiveCredentials();

export const handler = createLambdaFunction(app, {
  probot: createProbot({overrides: {secret, privateKey, appId}}),
});
