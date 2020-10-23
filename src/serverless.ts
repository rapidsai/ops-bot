import app from "./index";
import { serverless } from "@probot/serverless-lambda";

export const probot = serverless(app);
