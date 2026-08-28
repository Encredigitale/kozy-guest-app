import { createFileRoute } from "@tanstack/react-router";
import ProfileScreen from "@/extensions/user-info/ProfileScreen";

export const Route = createFileRoute("/_authenticated/app/profile")({
  head: () => ({
    meta: [
      { title: "Mon profil — Kozy" },
      {
        name: "description",
        content:
          "Gérez votre identité, vos coordonnées, vos préférences alimentaires, vos allergies et vos consentements Kozy.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfileScreen,
});
