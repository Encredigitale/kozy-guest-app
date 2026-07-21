import type { WidgetProps } from "@/core/registry/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

export default function PdfExportWidget({ config }: WidgetProps) {
  const title = (config?.title as string) ?? "Export événement";

  const exportPdf = () => {
    // Simple print-based PDF export — the browser handles the actual PDF generation.
    // A future version can call a server function to render server-side PDFs.
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression");
      return;
    }
    win.document.write(`
      <html><head><title>${title}</title>
      <style>body{font-family:system-ui;padding:2rem;} h1{color:#333}</style>
      </head><body>
      <h1>${title}</h1>
      <p>Généré le ${new Date().toLocaleString("fr-FR")}</p>
      <hr/>
      <p>Contenu exporté depuis la plateforme.</p>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 200);
  };

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
            <FileDown className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Export PDF</CardTitle>
            <CardDescription>Générer un PDF de l'événement.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button onClick={exportPdf} size="sm" className="rounded-full">
          <FileDown className="h-3.5 w-3.5" /> Exporter en PDF
        </Button>
      </CardContent>
    </Card>
  );
}
