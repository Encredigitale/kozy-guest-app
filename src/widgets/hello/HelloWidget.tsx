import type { WidgetProps } from "@/core/registry/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function HelloWidget({ config }: WidgetProps) {
  const message = (config?.message as string | undefined) ?? "Bonjour depuis le premier widget !";
  return (
    <div className="p-8 max-w-3xl">
      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Hello World</CardTitle>
              <CardDescription>Widget de démonstration chargé depuis le registry.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{message}</p>
          <pre className="mt-4 p-3 rounded-lg bg-muted text-xs overflow-x-auto">
{JSON.stringify(config ?? {}, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
