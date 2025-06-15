import "@/server-only";
import { DB_FILE } from "@/config-server";

export const dbController = {
  "/api/db/export": {
    GET: (req) => {
      return new Response(Bun.file(DB_FILE), {
        headers: {
          "content-disposition": `attachment; filename="database-${Date.now()}.sqlite"`,
        },
      });
    },
  },
};
