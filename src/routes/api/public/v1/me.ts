import { createFileRoute } from "@tanstack/react-router";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function cors(res: Response): Response {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Headers", "authorization, content-type");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  return res;
}

export const Route = createFileRoute("/api/public/v1/me")({
  server: {
    handlers: {
      OPTIONS: async () => cors(new Response(null, { status: 204 })),
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token.startsWith("fw_")) {
          return cors(Response.json({ error: "unauthorized" }, { status: 401 }));
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const hash = await sha256Hex(token);

        const { data: row } = await supabaseAdmin
          .from("api_tokens")
          .select("id, user_id, scopes, expires_at, revoked_at")
          .eq("token_hash", hash)
          .maybeSingle();

        if (!row || row.revoked_at || (row.expires_at && new Date(row.expires_at) < new Date())) {
          return cors(Response.json({ error: "unauthorized" }, { status: 401 }));
        }

        await supabaseAdmin
          .from("api_tokens")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", row.id);

        await supabaseAdmin.from("audit_log").insert({
          user_id: row.user_id,
          action: "api.call",
          target: "/api/public/v1/me",
          metadata: { token_id: row.id, ip: request.headers.get("cf-connecting-ip") ?? null },
        });

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .eq("user_id", row.user_id)
          .maybeSingle();

        return cors(
          Response.json({
            user_id: row.user_id,
            scopes: row.scopes,
            profile,
          }),
        );
      },
    },
  },
});
