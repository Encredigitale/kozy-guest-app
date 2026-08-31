import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { BookUser, Plus, ChevronRight } from "lucide-react";
import { useWidgetItems } from "@/widgets/_shared/useWidgetItems";

export default function MyContactsWidget() {
  const { items } = useWidgetItems("contacts.book", { scope_type: "global", scope_id: null });
  const recent = items.slice(-4).reverse();

  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookUser className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Carnet d'adresses</h2>
          </div>
          <Link to="/app/contacts" search={{ c: undefined }} className="text-xs text-primary hover:underline flex items-center gap-1">
            Tout voir <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <Link
            to="/app/contacts"
            search={{ c: undefined }}
            className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground border border-dashed rounded-lg hover:bg-accent transition-colors"
          >
            <Plus className="h-4 w-4" /> Ajouter un contact
          </Link>
        ) : (
          <>
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {recent.map((c) => {
                const name = String(c.payload.name ?? "");
                const initials = name
                  .split(" ")
                  .map((s) => s[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <Link
                    key={c.id}
                    to="/app/contacts"
                    search={{ c: c.id }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/60 hover:bg-accent transition-colors text-center"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center text-xs font-semibold text-primary">
                      {initials || "?"}
                    </div>
                    <span className="text-xs font-medium truncate w-full">{name}</span>
                  </Link>
                );
              })}
            </ul>
            <Link
              to="/app/contacts"
              search={{ c: undefined }}
              className="mt-3 flex items-center justify-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="h-3 w-3" /> Ajouter un contact
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
