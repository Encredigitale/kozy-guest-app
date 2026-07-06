import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Loader2, Plus, Search, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { contactGroupLabel } from "@/lib/contact-groups";
import { StepShell, Field } from "./shell";
import { useEventNewWizard } from "./context";
import type { WidgetContext } from "@/core/widgets";

type Contact = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  group_type: string | null;
  linked_user_id: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{6,}$/;

export function EventNewStep3Widget({ context }: { context: WidgetContext }) {
  const userId = context.userId as string;
  const { data, addGuest, removeGuest, isContactAdded } = useEventNewWizard();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    group_type: "friends",
  });
  const [newContactErrors, setNewContactErrors] = useState<{
    email?: string;
    phone?: string;
    general?: string;
  }>({});
  const [creatingContact, setCreatingContact] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadContacts = () => {
    setContactsLoading(true);
    setContactsError(null);
    supabase
      .from("contacts")
      .select("id,first_name,last_name,email,phone,group_type,linked_user_id")
      .eq("owner_id", userId)
      .order("first_name", { ascending: true })
      .then(({ data: rows, error }) => {
        if (error) setContactsError("Impossible de charger vos contacts. Réessayez.");
        else if (rows) setContacts(rows as Contact[]);
        setContactsLoading(false);
      });
  };

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: rows, error } = await supabase
        .from("contacts")
        .select("id,first_name,last_name,email,phone,group_type,linked_user_id")
        .eq("owner_id", userId)
        .order("first_name", { ascending: true });
      if (cancel) return;
      if (error) setContactsError("Impossible de charger vos contacts. Réessayez.");
      else if (rows) setContacts(rows as Contact[]);
      setContactsLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [userId]);

  const trimmedSearch = search.trim();
  const looksLikeEmail = trimmedSearch.includes("@");
  const looksLikePhone = /^[\d+\s().-]+$/.test(trimmedSearch) && /\d/.test(trimmedSearch);
  const searchFormatError =
    trimmedSearch.length > 2
      ? looksLikeEmail && !EMAIL_RE.test(trimmedSearch)
        ? "Format d'email invalide."
        : looksLikePhone && !PHONE_RE.test(trimmedSearch)
          ? "Format de téléphone invalide."
          : null
      : null;

  const contactFullName = (c: Contact) =>
    [c.first_name, c.last_name].filter(Boolean).join(" ").trim();

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts.slice(0, 8);
    return contacts
      .filter((c) => {
        const name = contactFullName(c).toLowerCase();
        const email = (c.email ?? "").toLowerCase();
        const phone = (c.phone ?? "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      })
      .slice(0, 8);
  }, [contacts, search]);

  const addContactAsGuest = (c: Contact) => {
    if (isContactAdded(c.id)) return;
    addGuest({
      contactId: c.id,
      name: contactFullName(c) || c.email || "Invité",
      email: c.email ?? "",
      isMember: !!c.linked_user_id,
    });
    setSearch("");
    setSearchOpen(false);
    searchInputRef.current?.focus();
  };

  const openCreateContact = () => {
    const q = search.trim();
    setNewContactErrors({});
    if (q.includes("@")) {
      setNewContact((n) => ({ ...n, email: q, phone: "", first_name: "" }));
    } else if (looksLikePhone) {
      setNewContact((n) => ({ ...n, phone: q, email: "", first_name: "" }));
    } else {
      setNewContact((n) => ({ ...n, first_name: q, email: "", phone: "" }));
    }
    setSearchOpen(false);
    setNewContactOpen(true);
  };

  const createContact = async () => {
    const first = newContact.first_name.trim();
    const email = newContact.email.trim();
    const phone = newContact.phone.trim();
    const errors: typeof newContactErrors = {};
    if (email && !EMAIL_RE.test(email)) errors.email = "Format d'email invalide.";
    if (phone && !PHONE_RE.test(phone)) errors.phone = "Format de téléphone invalide (6 chiffres minimum).";
    if (!first && !email && !phone)
      errors.general = "Ajoutez au moins un prénom, un email ou un téléphone.";
    if (Object.keys(errors).length > 0) {
      setNewContactErrors(errors);
      return;
    }
    setNewContactErrors({});
    setCreatingContact(true);
    const { data: created, error } = await supabase
      .from("contacts")
      .insert({
        owner_id: userId,
        first_name: first || (email ? email.split("@")[0] : "Invité"),
        last_name: newContact.last_name.trim() || null,
        email: email || null,
        phone: phone || null,
        group_type: (newContact.group_type || null) as never,
      })
      .select("id,first_name,last_name,email,phone,group_type,linked_user_id")
      .single();
    setCreatingContact(false);
    if (error || !created) {
      setNewContactErrors({
        general: error?.message?.includes("duplicate")
          ? "Un contact avec cet email ou téléphone existe déjà."
          : "Impossible de créer le contact. Réessayez.",
      });
      return;
    }
    const c = created as Contact;
    setContacts((prev) => [...prev, c]);
    addContactAsGuest(c);
    setNewContact({ first_name: "", last_name: "", email: "", phone: "", group_type: "friends" });
    setNewContactOpen(false);
  };

  return (
    <StepShell
      title="Invitez les personnes qui partageront ce moment."
      subtitle="Ajoutez vos invités maintenant ou faites-le plus tard. Vous pourrez toujours modifier votre liste."
    >
      <div className="rounded-3xl border bg-card p-4 space-y-3">
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={search}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (filteredContacts.length === 1) addContactAsGuest(filteredContacts[0]);
                    else if (search.trim() && filteredContacts.length === 0) openCreateContact();
                  }
                }}
                placeholder="Rechercher un contact par nom ou email…"
                className="pl-9 h-11 rounded-2xl"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="p-0 w-[--radix-popover-trigger-width] max-h-72 overflow-y-auto"
          >
            {contactsLoading ? (
              <div className="p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm">Chargement de votre carnet…</p>
              </div>
            ) : contactsError ? (
              <div className="p-3 space-y-2">
                <p className="text-sm text-destructive">{contactsError}</p>
                <Button type="button" variant="outline" className="w-full rounded-2xl" onClick={loadContacts}>
                  Réessayer
                </Button>
              </div>
            ) : searchFormatError ? (
              <div className="p-3 space-y-2">
                <p className="text-sm text-destructive">{searchFormatError}</p>
                <p className="text-xs text-muted-foreground">
                  Vous pouvez tout de même créer un contact avec ces informations.
                </p>
                <Button type="button" variant="outline" className="w-full rounded-2xl" onClick={openCreateContact}>
                  <UserPlus className="h-4 w-4" /> Créer un nouveau contact
                </Button>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-4 space-y-3 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {trimmedSearch
                      ? "Aucun contact trouvé"
                      : contacts.length === 0
                        ? "Votre carnet est vide"
                        : "Commencez à taper pour rechercher"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {trimmedSearch
                      ? `Aucun contact ne correspond à « ${trimmedSearch} ».`
                      : contacts.length === 0
                        ? "Créez votre premier contact pour l'ajouter à ce moment."
                        : "Nom, email ou téléphone."}
                  </p>
                </div>
                <Button type="button" variant="outline" className="w-full rounded-2xl" onClick={openCreateContact}>
                  <UserPlus className="h-4 w-4" /> Créer un nouveau contact
                  {trimmedSearch ? ` « ${trimmedSearch} »` : ""}
                </Button>
              </div>
            ) : (
              <div className="py-1">
                {filteredContacts.map((c) => {
                  const added = isContactAdded(c.id);
                  const isMember = !!c.linked_user_id;
                  const label = isMember ? "Inviter" : "Ajouter";
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-accent/50">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium uppercase shrink-0">
                        {(c.first_name?.[0] ?? "") + (c.last_name?.[0] ?? "")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {contactFullName(c) || c.email}
                          </p>
                          {isMember && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                              Membre
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.email ?? c.phone ?? contactGroupLabel(c.group_type)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={added ? "ghost" : "default"}
                        disabled={added}
                        onClick={() => addContactAsGuest(c)}
                        className="rounded-full h-8"
                      >
                        {added ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> Ajouté
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" /> {label}
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
                <div className="border-t p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start rounded-xl text-sm"
                    onClick={openCreateContact}
                  >
                    <UserPlus className="h-4 w-4" /> Créer un nouveau contact
                    {trimmedSearch ? ` « ${trimmedSearch} »` : ""}
                  </Button>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">
          Un lien d'invitation sera généré après création — vous pourrez le partager par email ou en
          direct.
        </p>
      </div>

      {data.guests.length > 0 && (
        <div className="grid gap-2">
          {data.guests.map((g, i) => (
            <GuestCard key={i} name={g.name} email={g.email} isMember={g.isMember} onRemove={() => removeGuest(i)} />
          ))}
        </div>
      )}

      <Dialog open={newContactOpen} onOpenChange={setNewContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer un nouveau contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Prénom">
                <Input
                  autoFocus
                  value={newContact.first_name}
                  onChange={(e) => setNewContact((n) => ({ ...n, first_name: e.target.value }))}
                  className="h-11 rounded-2xl"
                />
              </Field>
              <Field label="Nom">
                <Input
                  value={newContact.last_name}
                  onChange={(e) => setNewContact((n) => ({ ...n, last_name: e.target.value }))}
                  className="h-11 rounded-2xl"
                />
              </Field>
            </div>
            <Field label="Email">
              <Input
                type="email"
                value={newContact.email}
                onChange={(e) => {
                  setNewContact((n) => ({ ...n, email: e.target.value }));
                  if (newContactErrors.email) setNewContactErrors((er) => ({ ...er, email: undefined }));
                }}
                aria-invalid={!!newContactErrors.email}
                className={cn("h-11 rounded-2xl", newContactErrors.email && "border-destructive")}
              />
              {newContactErrors.email && (
                <p className="text-xs text-destructive mt-1">{newContactErrors.email}</p>
              )}
            </Field>
            <Field label="Téléphone">
              <Input
                value={newContact.phone}
                onChange={(e) => {
                  setNewContact((n) => ({ ...n, phone: e.target.value }));
                  if (newContactErrors.phone) setNewContactErrors((er) => ({ ...er, phone: undefined }));
                }}
                aria-invalid={!!newContactErrors.phone}
                className={cn("h-11 rounded-2xl", newContactErrors.phone && "border-destructive")}
              />
              {newContactErrors.phone && (
                <p className="text-xs text-destructive mt-1">{newContactErrors.phone}</p>
              )}
            </Field>
            <Field label="Groupe">
              <Select
                value={newContact.group_type}
                onValueChange={(v) => setNewContact((n) => ({ ...n, group_type: v }))}
              >
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="family">Famille</SelectItem>
                  <SelectItem value="friends">Amis</SelectItem>
                  <SelectItem value="colleagues">Collègues</SelectItem>
                  <SelectItem value="neighbors">Voisins</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {newContactErrors.general && (
              <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-3 py-2">
                {newContactErrors.general}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewContactOpen(false)} disabled={creatingContact}>
              Annuler
            </Button>
            <Button onClick={createContact} disabled={creatingContact}>
              {creatingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Créer et ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StepShell>
  );
}

function GuestCard({
  name,
  email,
  isMember,
  onRemove,
}: {
  name: string;
  email: string;
  isMember?: boolean;
  onRemove: () => void;
}) {
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  }, [name]);
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border bg-card animate-fade-in">
      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium uppercase text-sm shrink-0">
        {initials || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{name}</p>
          {isMember && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
              Membre
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
          <Check className="h-3 w-3" />
          {email ? `Invitation à envoyer · ${email}` : "Ajouté sans email"}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive p-1"
        aria-label={`Retirer ${name}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
