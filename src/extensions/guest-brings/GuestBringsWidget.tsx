import { useMemo } from "react";
import type { WidgetProps } from "@/core/registry/components";
import { useEventInvitations } from "@/extensions/invitations/useInvitations";
import { useContributionCatalog, useEventContributions } from "./useGuestBrings";
import { ContributionIcon } from "./icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift } from "lucide-react";

export default function GuestBringsWidget({ config }: WidgetProps) {
  const eventId = (config?.eventId as string) ?? "";
  const { data: contributions = [], isLoading } = useEventContributions(eventId);
  const { data: catalog } = useContributionCatalog();
  const { invitations } = useEventInvitations(eventId);

  const types = catalog?.types ?? [];

  const byInvitation = useMemo(() => {
    const map = new Map<string, typeof contributions>();
    for (const c of contributions) {
      const list = map.get(c.invitation_id) ?? [];
      list.push(c);
      map.set(c.invitation_id, list);
    }
    return map;
  }, [contributions]);

  const summary = useMemo(() => {
    const counts = new Map<string, { label: string; icon: string; count: number }>();
    for (const c of contributions) {
      const t = types.find((t) => t.id === c.contribution_type_id);
      const key = t?.id ?? "other";
      const entry = counts.get(key) ?? { label: t?.label ?? "Autre", icon: t?.icon ?? "Gift", count: 0 };
      entry.count += c.quantity && c.quantity > 0 ? c.quantity : 1;
      counts.set(key, entry);
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [contributions, types]);

  const accepted = invitations.filter((i) => i.status === "accepted");

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10">
            <Gift className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Ce que les invités apportent</CardTitle>
            <CardDescription>Apports déclarés par les invités qui participent.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <>
            {summary.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {summary.map((s) => (
                  <Badge key={s.label} variant="secondary" className="gap-1.5 rounded-full px-3 py-1">
                    <ContributionIcon name={s.icon} className="h-3.5 w-3.5" />
                    {s.count} {s.label.toLowerCase()}
                  </Badge>
                ))}
              </div>
            )}

            {accepted.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun invité n'a encore confirmé sa participation.
              </p>
            ) : (
              <ul className="space-y-3">
                {accepted.map((inv) => {
                  const list = byInvitation.get(inv.id) ?? [];
                  return (
                    <li key={inv.id} className="space-y-1">
                      <p className="text-sm font-medium">{inv.name || inv.email || "Invité"}</p>
                      {list.length === 0 ? (
                        <p className="text-sm text-muted-foreground">—</p>
                      ) : (
                        list.map((c) => {
                          const t = types.find((t) => t.id === c.contribution_type_id);
                          return (
                            <p key={c.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <ContributionIcon name={t?.icon} className="h-3.5 w-3.5 text-primary" />
                              {c.quantity ? `${c.quantity} ${c.unit ?? ""} ` : ""}
                              {c.label}
                              {c.note && <span className="text-xs">({c.note})</span>}
                            </p>
                          );
                        })
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
