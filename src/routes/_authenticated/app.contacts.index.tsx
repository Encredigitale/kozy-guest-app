import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Users, Sparkles } from "lucide-react";
import { CONTACT_GROUPS, contactGroupLabel } from "@/lib/contact-groups";
import { toast } from "sonner";

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

function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select(
          "id, first_name, last_name, email, phone, group_type, avatar_url, linked_user_id, invited_count, last_invited_at",
        )
        .order("invited_count", { ascending: false })
        .order("first_name", { ascending: true });
      if (error) {
        toast.error("Impossible de charger les contacts");
      } else {
        setContacts((data ?? []) as Contact[]);
      }
      setLoading(false);
    })();
  }, []);

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

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Mes contacts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Votre carnet privé pour retrouver vos proches en un instant.
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/app/contacts/new" })}>
          <Plus className="h-4 w-4" />
          Nouveau
        </Button>
      </header>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un contact…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={group} onValueChange={setGroup}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les groupes</SelectItem>
            {CONTACT_GROUPS.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Users className="h-10 w-10 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">
                {contacts.length === 0
                  ? "Votre carnet est vide"
                  : "Aucun contact ne correspond"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {contacts.length === 0
                  ? "Ajoutez vos proches pour les inviter en un clin d'œil."
                  : "Essayez une autre recherche."}
              </p>
            </div>
            {contacts.length === 0 && (
              <Button onClick={() => navigate({ to: "/app/contacts/new" })}>
                <Plus className="h-4 w-4" />
                Créer un contact
              </Button>
            )}
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
                      {c.invited_count > 0 && ` · Invité ${c.invited_count} fois`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
