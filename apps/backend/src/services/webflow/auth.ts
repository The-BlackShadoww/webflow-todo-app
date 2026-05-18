import Webflow from "webflow-api";
import type { SupportedScope } from "webflow-api/dist/core";

const client = new Webflow();

const authorizationUrl = client.authorizeUrl({
  client_id: process.env.WEBFLOW_CLIENT_ID as string,
  scopes: (
    process.env.WEBFLOW_SCOPES ||
    "sites:read,custom_code:read,custom_code:write"
  ).split(",") as SupportedScope[],
});

async function exchangeCodeForAccessToken(code: string): Promise<string> {
  const token = await client.accessToken({
    client_id: process.env.WEBFLOW_CLIENT_ID as string,
    client_secret: process.env.WEBFLOW_CLIENT_SECRET as string,
    code,
  });

  return token.access_token;
}

export default { authorizationUrl, exchangeCodeForAccessToken };
