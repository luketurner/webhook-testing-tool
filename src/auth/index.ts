import "@/server-only";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { oauthProvider } from "@better-auth/oauth-provider";
import { db } from "@/db";
import { BASE_URL } from "@/config";

export const auth = betterAuth({
  database: db,
  baseURL: BASE_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  // The oauth-provider plugin replaces the jwt plugin's /token endpoint
  disabledPaths: ["/token"],
  plugins: [
    jwt(),
    oauthProvider({
      // Hash routes: the SPA uses HashRouter. The consent page doubles as the
      // login page because unauthenticated users see the LoginForm fallback.
      loginPage: "/#/oauth/consent",
      consentPage: "/#/oauth/consent",
      // MCP clients self-register as public clients (RFC 7591)
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      validAudiences: [`${BASE_URL}/mcp`],
      silenceWarnings: {
        oauthAuthServerConfig: true,
      },
    }),
  ],
});
