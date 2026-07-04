import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { CONTACT_GROUPS } from "@/lib/contact-groups";
import type { WidgetContext } from "@/core/widgets";

type ContactEdit = {
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  group_type: string;
  notes: string | null;
  dietary_preferences: string | null;
  allergies: string | null;
  favorite_drinks: string | null;
};

export function ContactProfileWidget({ context }: { context: WidgetContext }) {
  const contactId = context.contactId as string;
  const [c, setC] = useState<ContactEdit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select(
          "first_name,last_name,email,phone,birth_date,group_type,notes,dietary_preferences,allergies,favorite_drinks",
        )
        .eq("id", contactId)
        .maybeSingle();
      if (error || !data) toast.error("Contact introuvable");
      else setC(data as ContactEdit);
      setLoading(false);
    })();
  }, [contactId]);

  const patch = (p: Partial<ContactEdit>) =>
    setC((prev) => (prev ? { ...prev, ...p } : prev));

  const save = async () => {
    if (!c) return;
    if (!c.first_name.trim()) return toast.error("Prénom obligatoire");
    if (!c.email?.trim() && !c.phone?.trim())
      return toast.error("E-mail ou téléphone requis");
    setSaving(true);
    const { error } = await supabase
      .from("contacts")
      .update({
        first_name: c.first_name.trim(),
        last_name: c.last_name?.trim() || null,
        email: c.email?.trim() || null,
        phone: c.phone?.trim() || null,
        birth_date: c.birth_date || null,
        group_type: c.group_type as
          | "family"
          | "friends"
          | "colleagues"
          | "neighbors"
          | "other",
        notes: c.notes?.trim() || null,
        dietary_preferences: c.dietary_preferences?.trim() || null,
        allergies: c.allergies?.trim() || null,
        favorite_drinks: c.favorite_drinks?.trim() || null,
      })
      .eq("id", contactId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Contact mis à jour");
  };

  if (loading) return <p className="text-muted-foreground text-sm">Chargement…</p>;
  if (!c) return null;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Prénom</Label>
            <Input
              value={c.first_name}
              onChange={(e) => patch({ first_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nom</Label>
            <Input
              value={c.last_name ?? ""}
              onChange={(e) => patch({ last_name: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input
            type="email"
            value={c.email ?? ""}
            onChange={(e) => patch({ email: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Téléphone</Label>
          <Input
            type="tel"
            value={c.phone ?? ""}
            onChange={(e) => patch({ phone: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Date d'anniversaire</Label>
          <Input
            type="date"
            value={c.birth_date ?? ""}
            onChange={(e) => patch({ birth_date: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Groupe</Label>
          <Select value={c.group_type} onValueChange={(v) => patch({ group_type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_GROUPS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Préférences alimentaires</Label>
          <Input
            value={c.dietary_preferences ?? ""}
            onChange={(e) => patch({ dietary_preferences: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Allergies</Label>
          <Input
            value={c.allergies ?? ""}
            onChange={(e) => patch({ allergies: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Boissons préférées</Label>
          <Input
            value={c.favorite_drinks ?? ""}
            onChange={(e) => patch({ favorite_drinks: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Notes privées</Label>
          <Textarea
            value={c.notes ?? ""}
            onChange={(e) => patch({ notes: e.target.value })}
            rows={3}
            maxLength={1000}
          />
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}
