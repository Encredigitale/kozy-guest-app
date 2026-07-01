import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CalendarIcon,
  Check,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Plus,
  Search,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EVENT_TYPES,
  GUEST_CIRCLES,
  type EventTypeValue,
} from "@/lib/event-types";
import { contactGroupLabel } from "@/lib/contact-groups";

export const Route = createFileRoute("/_authenticated/app/events/new")({
  head: () => ({ meta: [{ title: "Créer un moment — Kosy" }] }),
  component: NewEventPage,
});

type Guest = {
  name: string;
  email: string;
  contactId?: string;
  isMember?: boolean;
};

type Contact = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  group_type: string | null;
  linked_user_id: string | null;
};



const STEP_ILLUSTRATIONS = ["🍽️", "🍷", "👥"];

function NewEventPage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  // Step 1
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("19:30");
  const [location, setLocation] = useState("");

  // Step 2
  const [type, setType] = useState<EventTypeValue>("diner");
  const [circle, setCircle] = useState<string>("");
  const [menu, setMenu] = useState("");
  const [description, setDescription] = useState("");

  // Step 3
  const [guests, setGuests] = useState<Guest[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
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
  const [creatingContact, setCreatingContact] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const totalSteps = 3;
  const progress = createdEventId ? 100 : (step / totalSteps) * 100;

  const canNextFromStep1 = title.trim().length > 0 && !!date;

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id,first_name,last_name,email,phone,group_type,linked_user_id")
        .eq("owner_id", user.id)
        .order("first_name", { ascending: true });
      if (!cancel && data) setContacts(data as Contact[]);
    })();
    return () => {
      cancel = true;
    };
  }, [user.id]);

  const goNext = () => {
    if (step === 1 && !canNextFromStep1) {
      toast.error("Ajoutez au moins un nom et une date.");
      return;
    }
    setDirection("forward");
    setStep((s) => Math.min(3, s + 1));
  };
  const goBack = () => {
    setDirection("backward");
    setStep((s) => Math.max(1, s - 1));
  };

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

  const isContactAdded = (id: string) =>
    guests.some((g) => g.contactId === id);

  const addContactAsGuest = (c: Contact) => {
    if (isContactAdded(c.id)) return;
    setGuests((g) => [
      ...g,
      {
        contactId: c.id,
        name: contactFullName(c) || c.email || "Invité",
        email: c.email ?? "",
        isMember: !!c.linked_user_id,
      },
    ]);
    setSearch("");
    setSearchOpen(false);
    searchInputRef.current?.focus();
  };

  const openCreateContact = () => {
    const q = search.trim();
    // Guess: if contains @, use as email, else as first name
    if (q.includes("@")) {
      setNewContact((n) => ({ ...n, email: q, first_name: "" }));
    } else {
      setNewContact((n) => ({ ...n, first_name: q, email: "" }));
    }
    setSearchOpen(false);
    setNewContactOpen(true);
  };

  const createContact = async () => {
    const first = newContact.first_name.trim();
    const email = newContact.email.trim();
    if (!first && !email) {
      toast.error("Ajoutez au moins un prénom ou un email.");
      return;
    }
    setCreatingContact(true);
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        owner_id: user.id,
        first_name: first || (email ? email.split("@")[0] : "Invité"),
        last_name: newContact.last_name.trim() || null,
        email: email || null,
        phone: newContact.phone.trim() || null,
        group_type: (newContact.group_type || null) as never,
      })
      .select("id,first_name,last_name,email,phone,group_type,linked_user_id")
      .single();
    setCreatingContact(false);
    if (error || !data) {
      toast.error("Impossible de créer le contact.");
      return;
    }
    const c = data as Contact;
    setContacts((prev) => [...prev, c]);
    addContactAsGuest(c);
    setNewContact({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      group_type: "friends",
    });
    setNewContactOpen(false);
    toast.success("Contact ajouté à votre carnet.");
  };


  const createEvent = async () => {
    if (!date) return;
    setSaving(true);
    const [hh, mm] = time.split(":").map((n) => parseInt(n, 10));
    const eventAt = new Date(date);
    eventAt.setHours(hh || 0, mm || 0, 0, 0);

    const { data: created, error } = await supabase
      .from("events")
      .insert({
        owner_id: user.id,
        event_type: type,
        event_subtype: circle || null,
        title: title.trim(),
        event_at: eventAt.toISOString(),
        location: location.trim() || null,
        description: description.trim() || null,
        menu_or_theme: menu.trim() || null,
      })
      .select("id")
      .single();

    if (error || !created) {
      setSaving(false);
      toast.error("Impossible de créer le moment.");
      return;
    }
    if (guests.length > 0) {
      await supabase.from("event_guests").insert(
        guests.map((g) => ({
          event_id: created.id,
          name: g.name,
          email: g.email || null,
        })),
      );
    }
    setSaving(false);
    setCreatedEventId(created.id);
  };

  // Success screen
  if (createdEventId) {
    return (
      <div className="max-w-xl mx-auto pt-4 pb-24">
        <ProgressHeader progress={100} step={3} total={3} success />
        <div className="mt-8 text-center animate-fade-in">
          <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-scale-in">
            <div className="text-5xl animate-fade-in">🎉</div>
          </div>
          <h1 className="font-serif text-3xl mb-2">Votre événement est prêt !</h1>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Vous pouvez maintenant inviter vos proches, organiser les
            contributions et préparer ce moment sereinement.
          </p>
          <div className="mt-8 flex flex-col gap-2">
            <Button
              size="lg"
              onClick={() =>
                navigate({
                  to: "/app/events/$eventId",
                  params: { eventId: createdEventId },
                })
              }
            >
              <Mail className="h-4 w-4" /> Inviter maintenant
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => navigate({ to: "/app" })}
            >
              Retour au tableau de bord
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pt-4 pb-24">
      <ProgressHeader progress={progress} step={step} total={totalSteps} />

      <div
        key={step}
        className={cn(
          "mt-8",
          direction === "forward" ? "animate-fade-in" : "animate-fade-in",
        )}
      >
        {step === 1 && (
          <StepShell
            title="Parlez-nous de votre événement."
            subtitle="Commençons par les informations essentielles. Vous pourrez compléter les détails ensuite."
          >
            <Field label="Nom de l'événement">
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. Dîner entre amis, Anniversaire de Julie…"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-11 rounded-2xl",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {date ? (
                        format(date, "d MMM yyyy", { locale: fr })
                      ) : (
                        <span>Choisir</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      locale={fr}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </Field>
              <Field label="Heure">
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="pl-9 h-11 rounded-2xl"
                  />
                </div>
              </Field>
            </div>

            <Field label="Lieu">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Adresse ou nom du lieu"
                  className="pl-9 h-11 rounded-2xl"
                />
              </div>
            </Field>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell
            title="Personnalisez votre événement."
            subtitle="Quelques informations supplémentaires permettront de mieux préparer ce moment et d'aider vos invités."
          >
            <Field label="Type d'événement">
              <Select
                value={type}
                onValueChange={(v) => setType(v as EventTypeValue)}
              >
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Cercle invité">
              <div className="flex flex-wrap gap-2">
                {GUEST_CIRCLES.map((c) => {
                  const active = circle === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCircle(active ? "" : c)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm border transition-all",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-accent border-border",
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Menu ou thème">
              <Input
                value={menu}
                onChange={(e) => setMenu(e.target.value)}
                placeholder="Ex. Barbecue, cuisine italienne, années 80…"
                className="h-11 rounded-2xl"
              />
            </Field>

            <Field label="Description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ajoutez quelques informations utiles pour vos invités…"
                rows={4}
                className="rounded-2xl"
              />
            </Field>
          </StepShell>
        )}

        {step === 3 && (
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
                          if (filteredContacts.length === 1) {
                            addContactAsGuest(filteredContacts[0]);
                          } else if (
                            search.trim() &&
                            filteredContacts.length === 0
                          ) {
                            openCreateContact();
                          }
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
                  {filteredContacts.length === 0 ? (
                    <div className="p-3 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {search.trim()
                          ? "Aucun contact trouvé."
                          : "Votre carnet est vide."}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full rounded-2xl"
                        onClick={openCreateContact}
                      >
                        <UserPlus className="h-4 w-4" /> Créer un nouveau
                        contact
                      </Button>
                    </div>
                  ) : (
                    <div className="py-1">
                      {filteredContacts.map((c) => {
                        const added = isContactAdded(c.id);
                        const isMember = !!c.linked_user_id;
                        const label = isMember ? "Inviter" : "Ajouter";
                        return (
                          <div
                            key={c.id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-accent/50"
                          >
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium uppercase shrink-0">
                              {(c.first_name?.[0] ?? "") +
                                (c.last_name?.[0] ?? "")}
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
                                {c.email ??
                                  c.phone ??
                                  contactGroupLabel(c.group_type)}
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
                          <UserPlus className="h-4 w-4" /> Créer un nouveau
                          contact
                          {search.trim() ? ` « ${search.trim()} »` : ""}
                        </Button>
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Un lien d'invitation sera généré après création — vous pourrez
                le partager par email ou en direct.
              </p>
            </div>

            {guests.length > 0 && (
              <div className="grid gap-2">
                {guests.map((g, i) => (
                  <GuestCard
                    key={i}
                    guest={g}
                    onRemove={() =>
                      setGuests((arr) => arr.filter((_, idx) => idx !== i))
                    }
                  />
                ))}
              </div>
            )}

          </StepShell>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="mt-8 flex gap-3">
        {step > 1 && (
          <Button
            variant="outline"
            size="lg"
            onClick={goBack}
            className="rounded-2xl"
            disabled={saving}
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
        )}
        <div className="flex-1" />
        {step < 3 ? (
          <Button
            size="lg"
            onClick={goNext}
            className="rounded-2xl min-w-32"
            disabled={step === 1 && !canNextFromStep1}
          >
            Suivant <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={createEvent}
            disabled={saving}
            className="rounded-2xl min-w-48"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Créer mon événement
          </Button>
        )}
      </div>

      {step === 1 && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate({ to: "/app" })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}

function ProgressHeader({
  progress,
  step,
  total,
  success = false,
}: {
  progress: number;
  step: number;
  total: number;
  success?: boolean;
}) {
  const illustration = success ? "🎉" : STEP_ILLUSTRATIONS[step - 1];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {success ? "Terminé" : `Étape ${step} / ${total}`}
        </span>
        <div
          key={illustration}
          className={cn(
            "text-2xl transition-transform",
            success ? "animate-scale-in" : "animate-fade-in",
          )}
        >
          {illustration}
        </div>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  );
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl leading-tight">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground font-normal">
        {label}
      </Label>
      {children}
    </div>
  );
}

function GuestCard({
  guest,
  onRemove,
}: {
  guest: Guest;
  onRemove: () => void;
}) {
  const initials = useMemo(() => {
    const parts = guest.name.trim().split(/\s+/);
    return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  }, [guest.name]);

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border bg-card animate-fade-in">
      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium uppercase text-sm shrink-0">
        {initials || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{guest.name}</p>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
          <Check className="h-3 w-3" /> Invitation à envoyer
          {guest.email ? ` · ${guest.email}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive p-1"
        aria-label={`Retirer ${guest.name}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
