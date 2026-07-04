import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CalendarPlus, Trash2 } from "lucide-react";
import type { WidgetContext } from "@/core/widgets";

export function ContactActionsWidget({ context }: { context: WidgetContext }) {
  const contactId = context.contactId as string;
  const navigate = useNavigate();

  const remove = async () => {
    if (!confirm("Supprimer ce contact ?")) return;
    const { error } = await supabase.from("contacts").delete().eq("id", contactId);
    if (error) return toast.error(error.message);
    toast.success("Contact supprimé");
    navigate({ to: "/app/contacts" });
  };

  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => navigate({ to: "/app/events/new" })}
        >
          <CalendarPlus className="h-4 w-4" />
          Inviter à un événement
        </Button>
        <Button variant="outline" onClick={remove} className="w-full text-destructive">
          <Trash2 className="h-4 w-4" />
          Supprimer le contact
        </Button>
      </CardContent>
    </Card>
  );
}
