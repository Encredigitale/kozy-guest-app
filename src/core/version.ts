/**
 * Core & DB version markers used to gate extension compatibility.
 * Extensions declare `min_core_version` and `min_db_version`; the compat
 * helper below refuses to activate any extension that requires a newer
 * Core or DB than what is currently deployed.
 */
export const CORE_VERSION = "1.0.0";
export const DB_VERSION = 3;

import semver from "semver";

export type CompatInput = {
  min_core_version?: string | null;
  min_db_version?: number | null;
};

export type CompatResult = { ok: true } | { ok: false; reason: string };

export function checkExtensionCompatibility(ext: CompatInput): CompatResult {
  const minCore = ext.min_core_version && ext.min_core_version.trim() !== "" ? ext.min_core_version : "0.0.0";
  if (!semver.valid(minCore)) return { ok: false, reason: `Version Core minimale invalide (${minCore}).` };
  if (semver.gt(minCore, CORE_VERSION)) {
    return { ok: false, reason: `Nécessite Core ≥ ${minCore} (actuel : ${CORE_VERSION}).` };
  }
  const minDb = ext.min_db_version ?? 1;
  if (minDb > DB_VERSION) {
    return { ok: false, reason: `Nécessite DB ≥ ${minDb} (actuelle : ${DB_VERSION}).` };
  }
  return { ok: true };
}
