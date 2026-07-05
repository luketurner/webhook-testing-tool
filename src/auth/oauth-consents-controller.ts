import "@/server-only";
import { auth } from "./index";
import { db } from "@/db";
import { apiResponse } from "@/util/api-response";

// Session-authed consent management for the User Management page. Mounted
// through buildController (cookie auth); user scoping is enforced by the
// better-auth endpoints via the request headers.

async function getClientInfo(clientId: string, headers: Headers) {
  try {
    return await auth.api.getOAuthClientPublic({
      query: { client_id: clientId },
      headers,
    });
  } catch {
    return null;
  }
}

export const oauthConsentsController = {
  "/api/oauth/consents": {
    GET: async (req: Request) => {
      const consents = await auth.api.getOAuthConsents({
        headers: req.headers,
      });
      const withClients = await Promise.all(
        consents.map(async (consent) => ({
          ...consent,
          client: await getClientInfo(consent.clientId, req.headers),
        })),
      );
      return apiResponse.success(withClients);
    },
  },
  "/api/oauth/consents/:id": {
    DELETE: async (req: Bun.BunRequest<"/api/oauth/consents/:id">) => {
      const id = req.params.id;
      const consent = await auth.api.getOAuthConsent({
        query: { id },
        headers: req.headers,
      });
      if (!consent) {
        return apiResponse.notFound();
      }

      await auth.api.deleteOAuthConsent({
        body: { id },
        headers: req.headers,
      });

      // Deleting a consent does not invalidate previously issued tokens, so
      // revoke the client's refresh tokens and drop any opaque access tokens
      // for this user. (JWT access tokens are stateless and simply expire.)
      db.run(
        `UPDATE "oauthRefreshToken" SET "revoked" = ? WHERE "clientId" = ? AND "userId" = ? AND "revoked" IS NULL`,
        [new Date().toISOString(), consent.clientId, consent.userId],
      );
      db.run(
        `DELETE FROM "oauthAccessToken" WHERE "clientId" = ? AND "userId" = ?`,
        [consent.clientId, consent.userId],
      );

      return apiResponse.deleted();
    },
  },
};
