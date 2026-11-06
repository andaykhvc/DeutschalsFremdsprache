import "server-only";
import { createNeonAuth } from "@neon/auth/next/server";
let instance: ReturnType<typeof createNeonAuth> | undefined;
export function auth() {
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET)
    throw new Error("Die Anmeldung ist noch nicht eingerichtet.");
  return (instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET },
  }));
}
