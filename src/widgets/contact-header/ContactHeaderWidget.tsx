import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { contactGroupLabel } from "@/lib/contact-groups";
import type { WidgetContext } from "@/core/widgets";

type ContactHeader = {
  first_name: string;
  last_name: string | null;
  avatar_url: string | null;
  group_type: string;
  linked_user_id: string | null;
  invited_count: number;
  last_invited_at: string | null;
  last_attended_at: string | null;
  last_contribution: string | null;
};

export function ContactHeaderWidget({ context }: { context: WidgetContext }) {
  const contactId = context.contactId as string;
  const [c, setC] = useState<ContactHeader | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("contacts")
        .select(
          "first_name,last_name,avatar_url,group_type,linked_user_id,invited_count,last_invited_at,last_attended_at,last_contribution",
        )
        .eq("id", contactId)
        .maybeSingle();
      if (data) setC(data as ContactHeader);
    })();
  }, [contactId]);

  if (!c) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-4 space-y-0">
        <Avatar className="h-16 w-16">
          <AvatarImage src={c.avatar_url ?? undefined} />
          <AvatarFallback className="text-lg">
            {c.first_name[0]}
            {c.last_name?.[0] ?? ""}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle className="font-serif text-2xl">
            {c.first_name} {c.last_name ?? ""}
          </CardTitle>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline">{contactGroupLabel(c.group_type)}</Badge>
            {c.linked_user_id ? (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Membre
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Contact local
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Invité :</span>{" "}
            <strong>{c.invited_count}</strong> fois
          </p>
          {c.last_invited_at && (
            <p>
              <span className="text-muted-foreground">Dernière invitation :</span>{" "}
              {new Date(c.last_invited_at).toLocaleDateString("fr-FR")}
            </p>
          )}
          {c.last_attended_at && (
            <p>
              <span className="text-muted-foreground">Dernière participation :</span>{" "}
              {new Date(c.last_attended_at).toLocaleDateString("fr-FR")}
            </p>
          )}
          {c.last_contribution && (
            <p>
              <span className="text-muted-foreground">Contribution fréquente :</span>{" "}
              {c.last_contribution}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
