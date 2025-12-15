import serverless from "serverless-http";

import { app } from "../../src/app";

// Netlify invokes this function under this base path:
process.env.BASE_PATH ||= "/.netlify/functions/server";

export const handler = serverless(app);
