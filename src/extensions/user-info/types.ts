export type UserProfile = {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  phone_normalized: string | null;
  phone_verified: boolean;
  profile_picture_path: string | null;
  extra: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ReferentialItem = {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  active: boolean;
  allows_custom: boolean;
};

export type UserSelection = { id: string; refId: string | null; custom_value: string | null };

export type LegalDocType = "terms" | "privacy";

export type LegalDocument = {
  id: string;
  doc_type: "terms" | "privacy";
  version: string;
  title: string;
  content: string;
  requires_acceptance: boolean;
  published_at: string | null;
};

export type UserConsent = {
  id: string;
  consent_type: "terms" | "privacy";
  document_version: string;
  accepted_at: string;
  status: string;
};

export type ProfileFieldConfig = {
  id: string;
  field_key: string;
  label: string;
  status: "required" | "optional" | "hidden";
  locked: boolean;
  sort_order: number;
};

export const DOC_LABELS: Record<LegalDocType, string> = {
  terms: "Conditions Générales d'Utilisation",
  privacy: "Politique de confidentialité",
};
