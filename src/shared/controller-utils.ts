import "@/server-only";

export interface ApiResponse<T = unknown> {
  status: "ok" | "error" | "deleted";
  data?: T;
  message?: string;
}

export const createApiResponse = {
  success: <T>(data?: T): Response => Response.json({ status: "ok", data }),

  ok: (): Response => Response.json({ status: "ok" }),

  deleted: (): Response => Response.json({ status: "deleted" }),

  error: (message: string, status = 400): Response =>
    new Response(JSON.stringify({ status: "error", message }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),

  notFound: (): Response => new Response(null, { status: 404 }),

  badRequest: (message = "Bad Request"): Response =>
    createApiResponse.error(message, 400),

  serverError: (message = "Internal Server Error"): Response =>
    createApiResponse.error(message, 500),
};

export type ApiResponseCreator = typeof createApiResponse;
