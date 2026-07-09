import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/_seed-admin")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const email = "contact@encredigitale.com";
        const password = "KOZY_3&3FontSix";

        // Try to find existing user
        const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        let user = list.data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

        if (!user) {
          const created = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { first_name: "Super", last_name: "Admin" },
          });
          if (created.error) {
            return new Response(JSON.stringify({ error: created.error.message }), { status: 500 });
          }
          user = created.data.user!;
        } else {
          await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password,
            email_confirm: true,
          });
        }

        // Grant admin role
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
        if (roleErr) {
          return new Response(JSON.stringify({ error: roleErr.message }), { status: 500 });
        }

        return new Response(JSON.stringify({ ok: true, userId: user.id }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
