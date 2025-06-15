import "@/server-only";
import { db } from "@/db";

export const dbController = {
  "/api/db/export": {
    GET: (req) => {
      return new Response(db.serialize(), {
        headers: {
          "content-disposition": `attachment; filename="database-${Date.now()}.sqlite"`,
        },
      });
    },
  },
};
