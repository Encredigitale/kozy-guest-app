import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Sparkles, Download, Heart } from "lucide-react";
import { CONTACT_GROUPS, contactGroupLabel } from "@/lib/contact-groups";
import { canImportContacts, importDeviceContacts } from "@/lib/contacts-import";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/contacts/")({
  head: () => ({ meta: [{ title: "Mes contacts — Kosy" }] }),
  component: ContactsPage,
});

type Contact = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  group_type: string;
  avatar_url: string | null;
  linked_user_id: string | null;
  invited_count: number;
  last_invited_at: string | null;
};

const FILTERS = [
  { value: "all", label: "Tous" },
  ...CONTACT_GROUPS.map((g) => ({ value: g.value, label: g.label })),
] as const;

function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("all");
  const [importing, setImporting] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("contacts")
      .select(
        "id, first_name, last_name, email, phone, group_type, avatar_url, linked_user_id, invited_count, last_invited_at",
      )
      .order("invited_count", { ascending: false })
      .order("last_invited_at", { ascending: false, nullsFirst: false })
      .order("first_name", { ascending: true });
    if (error) {
      toast.error("Impossible de charger les contacts");
    } else {
      setContacts((data ?? []) as Contact[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImport = async () => {
    if (!canImportContacts()) {
      toast.info("Import indisponible", {
        description:
          "Votre appareil ne permet pas encore l'accès au carnet du téléphone. Utilisez « Ajouter » en attendant.",
      });
      return;
    }
    setImporting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Session expirée");
      const { inserted } = await importDeviceContacts(u.user.id);
      if (inserted === 0) toast.info("Aucun contact sélectionné");
      else {
        toast.success(`${inserted} contact${inserted > 1 ? "s" : ""} importé${inserted > 1 ? "s" : ""}`);
        await load();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import impossible";
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return contacts.filter((c) => {
      if (group !== "all" && c.group_type !== group) return false;
      if (!needle) return true;
      return (
        c.first_name.toLowerCase().includes(needle) ||
        (c.last_name ?? "").toLowerCase().includes(needle) ||
        (c.email ?? "").toLowerCase().includes(needle) ||
        (c.phone ?? "").toLowerCase().includes(needle) ||
        contactGroupLabel(c.group_type).toLowerCase().includes(needle)
      );
    });
  }, [contacts, q, group]);

  const isEmpty = !loading && contacts.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Mes contacts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Retrouvez toutes les personnes que vous invitez régulièrement.
          </p>
        </div>
        <Button
          size="icon"
          onClick={() => navigate({ to: "/app/contacts/new" })}
          aria-label="Ajouter un contact"
          className="rounded-full shrink-0"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      {!isEmpty && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un contact"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 h-11 rounded-xl bg-muted/40 border-transparent focus-visible:bg-background"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 no-scrollbar">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setGroup(f.value)}
                className={cn(
                  "shrink-0 px-4 h-9 rounded-full text-sm transition-colors border",
                  group === f.value
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : isEmpty ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1.5 max-w-sm mx-auto">
              <p className="font-serif text-xl">Votre carnet est encore vide</p>
              <p className="text-sm text-muted-foreground">
                Ajoutez vos proches pour les inviter plus rapidement à vos
                prochains événements.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <Button onClick={() => navigate({ to: "/app/contacts/new" })}>
                <Plus className="h-4 w-4" />
                Ajouter mon premier contact
              </Button>
              <Button variant="outline" onClick={handleImport} disabled={importing}>
                <Download className="h-4 w-4" />
                Importer mes contacts
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Users className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="font-medium">Aucun contact ne correspond</p>
            <p className="text-sm text-muted-foreground">
              Essayez un autre mot-clé ou changez de filtre.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to="/app/contacts/$contactId"
              params={{ contactId: c.id }}
              className="block"
            >
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="py-4 flex items-center gap-4">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={c.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {c.first_name[0]}
                      {c.last_name?.[0] ?? ""}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">
                        {c.first_name} {c.last_name ?? ""}
                      </p>
                      {c.linked_user_id && (
                        <Badge variant="secondary" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          Membre
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {contactGroupLabel(c.group_type)}
                      {c.invited_count > 0 &&
                        ` · Invité ${c.invited_count} fois`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!isEmpty && (
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleImport}
            disabled={importing}
            className="text-muted-foreground"
          >
            <Download className="h-4 w-4" />
            Importer mes contacts
          </Button>
        </div>
      )}
    </div>
  );
}

