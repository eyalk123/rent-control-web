/**
 * What this country calls the index rent can be linked to.
 *
 * The same shape, and the same reasoning, as `registryLabels.ts`: the country decides
 * *which concept applies* — Israel's מדד המחירים לצרכן, Spain's IPC, the UK's CPIH — and
 * the language decides *how to say it*. So the country config publishes an **i18n key**
 * and the locale files hold the words. A finished string in the config would break on a
 * case that already exists: an Israeli landlord reading the app in French.
 *
 * Israel points at `renter.rentChangeCpi` / `renter.rentChangeCpiNote`, the keys both apps
 * already ship, so the Israeli rendering path is untouched code rather than re-verified
 * code. Those are also the defaults here, for the same reason `capabilities.ts` defaults to
 * Israel's full set: between first paint and the config landing, the app must render what
 * it already did rather than a blank segment.
 *
 * A country with no index sends `null` for both. Nothing reads these in that case — the
 * mode is not in the picker at all — but the fallback keeps them a string rather than
 * making every caller handle a null.
 */

const ISRAEL = { label: 'renter.rentChangeCpi', note: 'renter.rentChangeCpiNote' };

let keys = ISRAEL;

export function setActiveIndexKeys(label: string | null, note: string | null): void {
  keys = { label: label ?? ISRAEL.label, note: note ?? ISRAEL.note };
}

/** The i18n key for the index-linked mode's label in the rent-change picker. */
export function indexLabelKey(): string {
  return keys.label;
}

/** The i18n key for the one-line explainer shown once the mode is picked. */
export function indexNoteKey(): string {
  return keys.note;
}
