import { supabase } from "@/integrations/supabase/client";

type ContactsAPI = {
  select: (
    props: string[],
    opts?: { multiple?: boolean },
  ) => Promise<
    Array<{ name?: string[]; email?: string[]; tel?: string[] }>
  >;
  getProperties?: () => Promise<string[]>;
};

const getApi = (): ContactsAPI | null => {
  if (typeof navigator === "undefined") return null;
  const n = navigator as Navigator & { contacts?: ContactsAPI };
  return n.contacts ?? null;
};

export const canImportContacts = () => {
  const api = getApi();
  return Boolean(api && typeof api.select === "function");
};

const splitName = (raw: string) => {
  const parts = raw.trim().split(/\s+/);
  if (parts.length <= 1) return { first_name: parts[0] ?? "Sans nom", last_name: null };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
};

export const importDeviceContacts = async (ownerId: string) => {
  const api = getApi();
  if (!api) throw new Error("unsupported");
  const props = ["name", "email", "tel"];
  const picked = await api.select(props, { multiple: true });
  if (!picked || picked.length === 0) return { inserted: 0 };

  const rows = picked
    .map((p) => {
      const rawName = p.name?.[0]?.trim() ?? "";
      const email = p.email?.[0]?.trim() ?? null;
      const phone = p.tel?.[0]?.trim() ?? null;
      if (!rawName && !email && !phone) return null;
      const { first_name, last_name } = splitName(
        rawName || email || phone || "Sans nom",
      );
      return {
        owner_id: ownerId,
        first_name,
        last_name,
        email,
        phone,
        group_type: "other" as const,
        source: "imported" as const,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return { inserted: 0 };
  const { error, count } = await supabase
    .from("contacts")
    .insert(rows as never, { count: "exact" });
  if (error) throw error;
  return { inserted: count ?? rows.length };
};
