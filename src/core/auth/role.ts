import { supabase } from "@/integrations/supabase/client";

/** Returns true only when the SuperAdmin role is confirmed. Throws when it cannot be verified. */
export async function fetchIsSuperAdmin(userId: string): Promise<boolean> {
  const { data, error } = await (supabase.rpc as any)("is_superadmin", { _user_id: userId });
  if (error) throw error;
  return data === true;
}

export async function homePathFor(userId: string): Promise<"/admin/dashboard" | "/app"> {
  try {
    return (await fetchIsSuperAdmin(userId)) ? "/admin/dashboard" : "/app";
  } catch {
    return "/app";
  }
}
