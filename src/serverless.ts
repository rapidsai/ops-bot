import app from "./index";
const { serverless } = require("@probot/serverless-lambda");

export const probot = serverless(app);
