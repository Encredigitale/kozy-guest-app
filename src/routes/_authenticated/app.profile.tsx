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
      { property: "og:title", content: "Mon profil — Kozy" },
      { property: "og:description", content: "Gérez votre identité, vos coordonnées et vos préférences Kozy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfileScreen,
});
