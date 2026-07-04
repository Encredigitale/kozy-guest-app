import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function DashboardCreateCtaWidget() {
  return (
    <div>
      <Button asChild size="lg" className="rounded-full">
        <Link to="/app/events/new">
          <Plus className="h-4 w-4" />
          Créer un événement
        </Link>
      </Button>
    </div>
  );
}
