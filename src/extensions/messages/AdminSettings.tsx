import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getMessagesConfig, saveMessagesConfig } from "@/lib/messages.functions";
import { DEFAULT_MESSAGES_CONFIG, type MessagesConfig } from "./config";

const TOGGLES: Array<{ key: keyof MessagesConfig; label: string }> = [
  { key: "enabled", label: "Messages actif globalement" },
  { key: "allowPhotos", label: "Autoriser les photos" },
  { key: "allowEdit", label: "Autoriser la modification des messages" },
  { key: "allowAuthorDelete", label: "Autoriser la suppression par l'auteur" },
  { key: "notificationsEnabled", label: "Notifications" },
  { key: "searchEnabled", label: "Indexation dans la recherche" },
];

export default function MessagesAdminSettings() {
  const getFn = useServerFn(getMessagesConfig);
  const saveFn = useServerFn(saveMessagesConfig);
  const { data } = useQuery({ queryKey: ["messages", "config"], queryFn: () => getFn() });
  const [config, setConfig] = useState<MessagesConfig>(DEFAULT_MESSAGES_CONFIG);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setConfig(data); }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Messages</CardTitle>
        <CardDescription>Discussion commune de chaque événement.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {TOGGLES.map((t) => (
          <div key={t.key} className="flex items-center justify-between gap-3">
            <Label className="text-sm">{t.label}</Label>
            <Switch checked={config[t.key]} onCheckedChange={(v) => setConfig((c) => ({ ...c, [t.key]: v }))} />
          </div>
        ))}
        <Button
          className="rounded-full"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try { await saveFn({ data: config }); toast.success("Réglages enregistrés."); }
            catch { toast.error("Enregistrement impossible."); }
            setSaving(false);
          }}
        >
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}
