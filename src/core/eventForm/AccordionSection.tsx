import { useEffect, useRef, type ReactNode } from "react";
import { Check, ChevronRight, AlertCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionStatus = "todo" | "done" | "error" | "optional";

const NUMERALS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];

export function AccordionSection({
  index,
  title,
  status,
  summary,
  isOpen,
  onToggle,
  children,
}: {
  index: number;
  title: string;
  status: SectionStatus;
  summary?: string | null;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(isOpen);

  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      const t = window.setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
      return () => window.clearTimeout(t);
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  const StatusIcon = status === "done" ? Check : status === "error" ? AlertCircle : Circle;

  return (
    <div
      ref={ref}
      className={cn(
        "scroll-mt-32 overflow-hidden rounded-lg border-2 bg-card shadow-[4px_4px_0_var(--color-border)] transition-colors",
        status === "error" ? "border-destructive" : "border-primary/30",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/25"
      >
        <span aria-hidden className="text-lg leading-none text-primary">
          {NUMERALS[index] ?? index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-sm">{title}</span>
          <span
            className={cn(
              "block truncate text-xs",
              status === "error" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {summary ||
              (status === "error"
                ? "À vérifier"
                : status === "optional"
                  ? "Facultatif"
                  : "À compléter")}
          </span>
        </span>
        <StatusIcon
          className={cn(
            "h-4 w-4 shrink-0",
            status === "done"
              ? "text-primary"
              : status === "error"
                ? "text-destructive"
                : "text-muted-foreground/50",
          )}
          aria-hidden
        />
        <span className="sr-only">
          {status === "done" ? "Complété" : status === "error" ? "Erreur" : "À compléter"}
        </span>
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-90",
          )}
          aria-hidden
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/60 px-4 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
