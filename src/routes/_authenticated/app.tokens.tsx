import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createApiToken, revokeApiToken } from "@/lib/tokens.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";

type TokenRow = {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/app/tokens")({
  head: () => ({ meta: [{ title: "Jetons API — Ma Belle Table" }] }),
  component: TokensPage,
});

function TokensPage() {
  const create = useServerFn(createApiToken);
  const revoke = useServerFn(revokeApiToken);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [freshToken, setFreshToken] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("api_tokens")
      .select("id, name, token_prefix, scopes, expires_at, revoked_at, last_used_at, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setTokens((data as TokenRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await create({
        data: {
          name: name.trim(),
          scopes: [],
          expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
        },
      });
      setFreshToken(res.token);
      setName("");
      setExpiresInDays("");
      toast.success("Jeton créé. Copiez-le maintenant.");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const onRevoke = async (id: string) => {
    if (!confirm("Révoquer ce jeton ?")) return;
    try {
      await revoke({ data: { id } });
      toast.success("Jeton révoqué.");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast.success("Copié.");
  };

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-primary">Jetons API</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Créez des jetons pour appeler l'API depuis vos scripts. Le jeton n'est affiché qu'une fois.
        </p>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Nouveau jeton</CardTitle>
          <CardDescription>Attribuez un nom explicite (ex. « script cron »).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-3 items-end">
            <div className="space-y-2">
              <Label htmlFor="tok-name">Nom</Label>
              <Input id="tok-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tok-exp">Expire (jours)</Label>
              <Input
                id="tok-exp"
                type="number"
                min={1}
                max={3650}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                placeholder="∞"
              />
            </div>
            <Button type="submit" className="rounded-full">Créer</Button>
          </form>

          {freshToken && (
            <div className="mt-4 p-3 rounded-lg bg-accent/40 border border-border/60">
              <p className="text-xs text-muted-foreground mb-1">
                Copiez ce jeton maintenant — il ne sera plus jamais affiché.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs break-all">{freshToken}</code>
                <Button size="sm" variant="ghost" onClick={() => copy(freshToken)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Vos jetons</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun jeton.</p>
          ) : (
            <div className="space-y-2">
              {tokens.map((t) => {
                const expired = t.expires_at && new Date(t.expires_at) < new Date();
                const state = t.revoked_at ? "révoqué" : expired ? "expiré" : "actif";
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{t.name}</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{state}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <code>{t.token_prefix}…</code> · créé le{" "}
                        {new Date(t.created_at).toLocaleDateString()}
                        {t.last_used_at && ` · utilisé ${new Date(t.last_used_at).toLocaleString()}`}
                        {t.expires_at && ` · expire ${new Date(t.expires_at).toLocaleDateString()}`}
                      </div>
                    </div>
                    {!t.revoked_at && (
                      <Button variant="ghost" size="sm" onClick={() => onRevoke(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Utilisation</CardTitle>
          <CardDescription>Un exemple d'appel authentifié.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto">
{`curl ${typeof window !== "undefined" ? window.location.origin : ""}/api/public/v1/me \\
  -H "Authorization: Bearer fw_..."`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
