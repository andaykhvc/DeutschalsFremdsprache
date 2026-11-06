import { auth } from "@/lib/auth/server";
import type { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
async function handle(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return auth()
    .handler()
    [req.method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE"](req, context);
}
export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
