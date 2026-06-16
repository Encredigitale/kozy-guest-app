import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, User } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Vous êtes bien déconnecté.");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/app" className="font-serif text-2xl text-primary">
            Kosy
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/profile">
                <User className="h-4 w-4" />
                Profil
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
