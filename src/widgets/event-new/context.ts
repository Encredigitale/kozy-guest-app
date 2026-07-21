import { createContext, useContext } from "react";

export type WizardValue = {
  type: string;
  setType: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  startsAt: string;
  setStartsAt: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  selectedWidgets: string[];
  toggleWidget: (id: string) => void;
  setSelectedWidgets: (ids: string[]) => void;
  step: number;
  next: () => void;
  back: () => void;
  submit: () => Promise<void>;
  saving: boolean;
};

export const WizardContext = createContext<WizardValue | null>(null);

export function useWizard(): WizardValue {
  const v = useContext(WizardContext);
  if (!v) throw new Error("Wizard widgets must be rendered inside the event.new surface.");
  return v;
}
