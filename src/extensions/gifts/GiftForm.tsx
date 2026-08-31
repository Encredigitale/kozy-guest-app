import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PersonPicker } from "./PersonPicker";
import { GIFT_VISIBILITY_LABELS, type GiftsConfig } from "./config";
import type { Gift, GiftPersonInput } from "./public-types";
import type { GiftInput } from "./useGifts";

function toInputs(list: Gift["recipients"]): GiftPersonInput[] {
  return list.map((p) => ({
    contactId: p.contact_id,
    displayName: p.display_name_snapshot,
    sourceType: p.source_type,
  }));
}

function toDateValue(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

type Props = {
  config: GiftsConfig;
  gift?: Gift;
  defaultDate?: string | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (input: GiftInput) => void;
};

export function GiftForm({ config, gift, defaultDate, submitting, onCancel, onSubmit }: Props) {
  const [name, setName] = useState(gift?.gift_name ?? "");
  const [description, setDescription] = useState(gift?.description ?? "");
  const [note, setNote] = useState(gift?.note ?? "");
  const [date, setDate] = useState(toDateValue(gift?.gift_date ?? defaultDate ?? null));
  const [visibility, setVisibility] = useState<Gift["visibility"]>(gift?.visibility ?? config.defaultVisibility);
  const [recipients, setRecipients] = useState<GiftPersonInput[]>(gift ? toInputs(gift.recipients) : []);
  const [givers, setGivers] = useState<GiftPersonInput[]>(gift ? toInputs(gift.givers) : []);

  const submit = () => {
    if (!name.trim()) return toast.error("Indiquez le cadeau.");
    if (recipients.length === 0) return toast.error("Indiquez à qui le cadeau est offert.");
    if (givers.length === 0) return toast.error("Indiquez qui offre le cadeau.");
    onSubmit({
      giftName: name.trim(),
      description: description.trim() || null,
      note: note.trim() || null,
      giftDate: date ? new Date(date).toISOString() : null,
      photoId: gift?.photo_id ?? null,
      visibility,
      recipients,
      givers,
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="gift-name">Quel cadeau ?</Label>
        <Input
          id="gift-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bouquet de fleurs"
          autoFocus
        />
      </div>

      <PersonPicker
        label="Offert à"
        value={recipients}
        onChange={setRecipients}
        multiple={config.multipleRecipients}
        allowFreeText={config.freeTextEnabled}
        useContacts={config.useContactsBook}
      />

      <PersonPicker
        label="Par"
        value={givers}
        onChange={setGivers}
        multiple={config.multipleGivers}
        allowFreeText={config.freeTextEnabled}
        useContacts={config.useContactsBook}
      />

      <details className="rounded-xl border border-border/60 bg-background p-3">
        <summary className="cursor-pointer text-sm text-muted-foreground">Informations complémentaires</summary>
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="gift-desc">Description</Label>
            <Input
              id="gift-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bouquet de roses rouges"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gift-note">Note</Label>
            <Textarea
              id="gift-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Offert au moment du dessert"
              rows={2}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="gift-date">Date</Label>
              <Input id="gift-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Visibilité</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as Gift["visibility"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GIFT_VISIBILITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </details>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="rounded-full" onClick={onCancel}>
          Annuler
        </Button>
        <Button size="sm" className="rounded-full" onClick={submit} disabled={submitting}>
          {gift ? "Enregistrer les modifications" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
