import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X, UserRound } from "lucide-react";
import type { GiftPersonInput } from "./public-types";
import { useContactOptions } from "./useGifts";

type Props = {
  label: string;
  value: GiftPersonInput[];
  onChange: (v: GiftPersonInput[]) => void;
  multiple: boolean;
  allowFreeText: boolean;
  useContacts: boolean;
  placeholder?: string;
};

export function PersonPicker({ label, value, onChange, multiple, allowFreeText, useContacts, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const { data: contacts = [] } = useContactOptions();

  const suggestions = useMemo(() => {
    if (!useContacts) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return contacts
      .filter((c) => !value.some((v) => v.contactId === c.id))
      .filter((c) =>
        [c.name, c.email, c.phone].some((f) => f.toLowerCase().includes(q)),
      )
      .slice(0, 5);
  }, [contacts, query, value, useContacts]);

  const add = (person: GiftPersonInput) => {
    onChange(multiple ? [...value, person] : [person]);
    setQuery("");
  };

  const removeAt = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  const canAddFree = allowFreeText && query.trim().length > 0;
  const disabled = !multiple && value.length > 0;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((p, idx) => (
            <Badge key={`${p.displayName}-${idx}`} variant="secondary" className="gap-1 rounded-full py-1 pl-2.5 pr-1.5">
              <UserRound className="h-3 w-3" />
              {p.displayName}
              <button type="button" onClick={() => removeAt(idx)} aria-label="Retirer">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {!disabled && (
        <div className="space-y-1.5">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder ?? "Rechercher un contact ou saisir un nom"}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canAddFree) {
                e.preventDefault();
                add({ contactId: null, displayName: query.trim(), sourceType: "manual" });
              }
            }}
          />
          {(suggestions.length > 0 || canAddFree) && (
            <div className="rounded-xl border border-border/60 bg-card p-1">
              {suggestions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => add({ contactId: c.id, displayName: c.name, sourceType: "contact" })}
                >
                  <UserRound className="h-3.5 w-3.5 text-primary" />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{c.email || c.phone}</span>
                </button>
              ))}
              {canAddFree && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start rounded-lg"
                  onClick={() => add({ contactId: null, displayName: query.trim(), sourceType: "manual" })}
                >
                  <Plus className="h-3.5 w-3.5" /> Saisir librement « {query.trim()} »
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
