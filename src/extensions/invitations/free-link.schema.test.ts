import { describe, it, expect } from "vitest";
import { freeIdentitySchema, freeRegistrationSchema, freeInvitationUrl, freeLinkAvailable } from "./free-link.schema";

describe("free invitations", () => {
  it("requires first name before access", () => {
    expect(freeIdentitySchema.safeParse({ firstName: " ", lastName: "Assogba" }).success).toBe(false);
  });
  it("requires last name before access", () => {
    expect(freeIdentitySchema.safeParse({ firstName: "Wilfried", lastName: " " }).success).toBe(false);
  });
  it("normalizes unnecessary spaces without requiring other fields", () => {
    expect(freeIdentitySchema.parse({ firstName: "  Wilfried  ", lastName: "  ASSOGBA   Martin " })).toEqual({ firstName: "Wilfried", lastName: "ASSOGBA Martin" });
  });
  it("rejects identity injection", () => {
    expect(freeIdentitySchema.safeParse({ firstName: "<script>", lastName: "Assogba" }).success).toBe(false);
  });
  it("rejects automated honeypot submissions", () => {
    expect(freeRegistrationSchema.safeParse({ firstName: "Wilfried", lastName: "Assogba", token: "a".repeat(64), registrationKey: "b".repeat(64), website: "spam" }).success).toBe(false);
  });
  it("does not allow disabled links", () => {
    expect(freeLinkAvailable(false, "published")).toBe(false);
  });
  it("preserves private drafts", () => {
    expect(freeLinkAvailable(true, "draft")).toBe(false);
  });
  it("rejects archived events", () => {
    expect(freeLinkAvailable(true, "archived")).toBe(false);
  });
  it("allows published active links", () => {
    expect(freeLinkAvailable(true, "published")).toBe(true);
  });
  it("uses the configured site URL", () => {
    expect(freeInvitationUrl("https://kozy-guest-app.lovable.app/", "a".repeat(64))).toBe(`https://kozy-guest-app.lovable.app/invitation/${"a".repeat(64)}`);
  });
});