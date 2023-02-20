import { authorizer } from "webhook-authorizer";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const resp = await authorizer({
    allowedOrgs: ["rapidsai", "nv-morpheus"],
    event,
  });

  if (!resp.isAuthorized) {
    return {
      statusCode: resp.httpCode,
      body: resp.msg,
    };
  }

  const client = new LambdaClient({});
  const command = new InvokeCommand({
    FunctionName: process.env.probotFnName,
    Payload: Buffer.from(JSON.stringify(event)),
    InvocationType: "Event",
  });

  await client.send(command);
  return {
    body: "Org is authorized. Webhook received and processing.",
    statusCode: 202,
  };
};
