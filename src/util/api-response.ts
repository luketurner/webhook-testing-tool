/**
 * Utility functions for consistent API responses
 */

export const apiResponse = {
  success: (data: any) => Response.json(data),

  error: (message: string, status: number) =>
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),

  notFound: (message = "Not found") =>
    new Response(JSON.stringify({ error: message }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }),

  ok: () => Response.json({ status: "ok" }),

  created: (data: any) =>
    new Response(JSON.stringify(data), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }),
};
