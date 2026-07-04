import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import type { WidgetContext } from "@/core/widgets";

export function DashboardHeaderWidget({ context }: { context: WidgetContext }) {
  const userId = context.userId as string;
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", userId)
        .maybeSingle();
      setFirstName(data?.first_name ?? null);
    })();
  }, [userId]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("À bientôt !");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-serif text-4xl tracking-tight mb-2">
          Bonjour {firstName ?? ""} <span aria-hidden>👋</span>
        </h1>
        <p className="text-muted-foreground">
          Prêt à organiser votre prochain moment ?
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={signOut} className="shrink-0">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
