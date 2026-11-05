import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkFreeInvitationLink, registerFreeInvitation } from "@/lib/invitation-links.functions";
import { freeIdentitySchema, freeTokenSchema } from "@/extensions/invitations/free-link.schema";
import { BrandLogo } from "@/core/branding/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/invitation/$token")({
  head: () => ({ meta: [
    { title: "Rejoindre une invitation — Ma Belle Table" },
    { name: "description", content: "Indiquez votre prénom et votre nom pour rejoindre votre invitation privée." },
    { property: "og:title", content: "Rejoindre une invitation — Ma Belle Table" },
    { property: "og:description", content: "Retrouvez votre invitation privée, sans créer de compte." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
    { name: "referrer", content: "no-referrer" },
  ] }),
  component: FreeInvitationPage,
});

function FreeInvitationPage() {
  const { token } = Route.useParams();
  const check = useServerFn(checkFreeInvitationLink);
  const register = useServerFn(registerFreeInvitation);
  const navigate = useNavigate();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!freeTokenSchema.safeParse(token).success) { setAvailable(false); return; }
    check({ data: { token } }).then((result) => { if (!cancelled) setAvailable(result.available); }).catch(() => { if (!cancelled) setAvailable(false); });
    return () => { cancelled = true; };
  }, [token, check]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const identity = freeIdentitySchema.safeParse({ firstName, lastName });
    if (!identity.success) { setError(identity.error.issues[0]?.message ?? "Renseignez votre identité."); return; }
    setBusy(true); setError("");
    try {
      const storageKey = `kozy.invitation.registration.${token}`;
      let registrationKey: string | null = null;
      try { registrationKey = localStorage.getItem(storageKey); } catch { /* browser storage may be disabled */ }
      if (!freeTokenSchema.safeParse(registrationKey).success) {
        registrationKey = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
        try { localStorage.setItem(storageKey, registrationKey); } catch { /* personal URL remains usable */ }
      }
      if (!registrationKey) return;
      const result = await register({ data: { token, ...identity.data, registrationKey, website } });
      if (!result.ok) { setAvailable(false); return; }
      await navigate({ to: "/invitation/$eventId/$invitationId", params: { eventId: result.eventId, invitationId: result.invitationId }, search: { token: result.token }, replace: true });
    } catch { setError("Impossible de continuer. Réessayez dans un instant."); }
    finally { setBusy(false); }
  };

  return <main className="kozy-auth-shell flex min-h-dvh flex-col items-center px-4 py-8 sm:py-14">
    <BrandLogo size="md" />
    <div className="mt-8 w-full max-w-md space-y-5 rounded-lg border-2 border-primary bg-popup p-5 text-popup-foreground shadow-[6px_6px_0_var(--color-accent)] sm:p-8">
      {available === null ? <p role="status">Vérification de l’invitation…</p> : !available ? <><h1 className="font-serif text-xl">Invitation indisponible</h1><p>Ce lien est invalide ou désactivé, ou l’événement n’est pas ouvert aux invitations.</p></> : <>
        <h1 className="font-serif text-2xl">Vous êtes invité(e) !</h1>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="first-name">Prénom</Label><Input id="first-name" autoComplete="given-name" required maxLength={60} value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="last-name">Nom</Label><Input id="last-name" autoComplete="family-name" required maxLength={60} value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
          <div className="hidden" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? "Validation…" : "Valider et continuer"}</Button>
        </form>
      </>}
    </div>
  </main>;
}