import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { EventTypeValue } from "@/lib/event-types";

export type WizardGuest = {
  name: string;
  email: string;
  contactId?: string;
  isMember?: boolean;
};

export type EventNewWizardData = {
  // Step 1
  title: string;
  date: Date | undefined;
  time: string;
  location: string;
  // Step 2
  type: EventTypeValue;
  circle: string;
  menu: string;
  description: string;
  // Step 3
  guests: WizardGuest[];
};

type Ctx = {
  data: EventNewWizardData;
  update: (patch: Partial<EventNewWizardData>) => void;
  addGuest: (g: WizardGuest) => void;
  removeGuest: (index: number) => void;
  isContactAdded: (contactId: string) => boolean;
};

const EventNewWizardCtx = createContext<Ctx | null>(null);

export function EventNewWizardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<EventNewWizardData>({
    title: "",
    date: undefined,
    time: "19:30",
    location: "",
    type: "diner",
    circle: "",
    menu: "",
    description: "",
    guests: [],
  });

  const value = useMemo<Ctx>(
    () => ({
      data,
      update: (patch) => setData((d) => ({ ...d, ...patch })),
      addGuest: (g) =>
        setData((d) =>
          d.guests.some((x) => g.contactId && x.contactId === g.contactId)
            ? d
            : { ...d, guests: [...d.guests, g] },
        ),
      removeGuest: (index) =>
        setData((d) => ({ ...d, guests: d.guests.filter((_, i) => i !== index) })),
      isContactAdded: (contactId) => data.guests.some((g) => g.contactId === contactId),
    }),
    [data],
  );

  return <EventNewWizardCtx.Provider value={value}>{children}</EventNewWizardCtx.Provider>;
}

export function useEventNewWizard(): Ctx {
  const ctx = useContext(EventNewWizardCtx);
  if (!ctx) throw new Error("useEventNewWizard must be used within EventNewWizardProvider");
  return ctx;
}

export function isStep1Valid(d: EventNewWizardData) {
  return d.title.trim().length > 0 && !!d.date;
}
