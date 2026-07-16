import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const createApiToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().min(1).max(80),
        scopes: z.array(z.string()).default([]),
        expiresInDays: z.number().int().positive().max(3650).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const raw = randomToken(32);
    const token = `fw_${raw}`;
    const token_hash = await sha256Hex(token);
    const token_prefix = token.slice(0, 10);
    const expires_at = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 86400 * 1000).toISOString()
      : null;

    const { data: row, error } = await context.supabase
      .from("api_tokens")
      .insert({
        user_id: context.userId,
        name: data.name,
        token_prefix,
        token_hash,
        scopes: data.scopes,
        expires_at,
      })
      .select("id, name, token_prefix, scopes, expires_at, created_at")
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: "api_token.created",
      target: row.id,
      metadata: { name: data.name, scopes: data.scopes },
    });

    return { token, row };
  });

export const revokeApiToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("api_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: "api_token.revoked",
      target: data.id,
      metadata: {},
    });
    return { ok: true };
  });
