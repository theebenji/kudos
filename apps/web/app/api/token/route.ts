import { auth } from "@/auth";
import { mintApiToken } from "@/lib/api-token";

/** Hands browser code a short-lived API token; the client refreshes it before `expiresAt`. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not signed in" }, { status: 401 });
  return Response.json(await mintApiToken(session.user.id), {
    headers: { "cache-control": "no-store" },
  });
}
