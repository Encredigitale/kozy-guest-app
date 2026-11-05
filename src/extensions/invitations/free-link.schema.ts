import { z } from "zod";

export const freeTokenSchema = z.string().regex(/^[a-f0-9]{64}$/, "Lien invalide.");
const personName = z.string().trim().transform((value) => value.replace(/\s+/g, " ")).pipe(
  z.string().min(1, "Renseignez votre prénom et votre nom.").max(60, "Chaque nom doit contenir au maximum 60 caractères.").regex(/^[\p{L}\p{M} .’'\-]+$/u, "Utilisez uniquement des lettres pour votre identité."),
);
export const freeIdentitySchema = z.object({ firstName: personName, lastName: personName });
export const freeRegistrationSchema = freeIdentitySchema.extend({
  token: freeTokenSchema,
  registrationKey: freeTokenSchema,
  website: z.string().max(0, "Inscription impossible."),
});

export function freeLinkAvailable(active: boolean, status: string) {
  return active && status === "published";
}

export function freeInvitationUrl(base: string, token: string) {
  return `${base.replace(/\/+$/, "")}/invitation/${freeTokenSchema.parse(token)}`;
}