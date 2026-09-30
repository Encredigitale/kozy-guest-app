import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAdminData } from "@/lib/admin.functions";

type Kind = "users" | "events" | "invitations" | "contacts" | "audit";

export function AdminTablePage({ kind, title, intro }: { kind: Kind; title: string; intro?: string }) {
  const fn = useServerFn(listAdminData);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", kind], queryFn: () => fn({ data: { kind } }) });
  const rows = data?.rows ?? [];
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <div className="space-y-4">
      <div><h2 className="font-serif text-2xl">{title}</h2>{intro && <p className="text-sm text-muted-foreground">{intro}</p>}</div>
      {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
      {error && <p className="text-sm text-destructive">Accès refusé ou erreur de chargement.</p>}
      {!isLoading && !error && rows.length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée.</p>}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border-2 border-primary bg-card">
          <table className="w-full text-sm">
            <thead className="bg-accent/35"><tr>{cols.map((c) => <th key={c} className="px-3 py-2 text-left font-semibold">{c}</th>)}</tr></thead>
            <tbody>{rows.map((r: any, i: number) => (
              <tr key={i} className="border-t border-border">{cols.map((c) => <td key={c} className="px-3 py-2">{String(r[c] ?? "")}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
