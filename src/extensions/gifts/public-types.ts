export type GiftPersonRole = "recipient" | "giver";
export type GiftPersonSource = "contact" | "manual";

export type GiftPerson = {
  id: string;
  gift_id: string;
  role: GiftPersonRole;
  contact_id: string | null;
  user_id: string | null;
  manual_name: string | null;
  display_name_snapshot: string;
  source_type: GiftPersonSource;
  created_at: string;
};

export type Gift = {
  id: string;
  event_id: string;
  gift_name: string;
  description: string | null;
  note: string | null;
  gift_date: string | null;
  photo_id: string | null;
  visibility: "organizer" | "participants";
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  recipients: GiftPerson[];
  givers: GiftPerson[];
};

/** Personne sélectionnée dans le formulaire (contact ou saisie libre). */
export type GiftPersonInput = {
  contactId: string | null;
  displayName: string;
  sourceType: GiftPersonSource;
};
