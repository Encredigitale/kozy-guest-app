import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      setUser(data.user ?? null);
      if (data.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);
        const list = (roles ?? []).map((r) => String(r.role));
        if (!cancelled) {
          setIsAdmin(list.includes("admin") || list.includes("superadmin"));
          setIsSuperAdmin(list.includes("superadmin") || list.includes("admin"));
        }
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) { setIsAdmin(false); setIsSuperAdmin(false); }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading, isAdmin, isSuperAdmin };
}
