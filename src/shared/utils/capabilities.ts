/**
 * What the account's country is allowed to do.
 *
 * Published once when the country config resolves, the same way `money.ts` publishes the
 * formats and for the same reason: some of the things that read a capability are not
 * components — a Zod schema, a lease-schedule helper — so a hook cannot reach them.
 *
 * **The clients are not the enforcement point.** The API rejects a capability that is off
 * regardless of what the UI does; this exists so the app does not offer a control whose
 * value the server will refuse. A flag hidden here with a live endpoint behind it is a bug,
 * not a feature flag — see the backend's `_guard_index_linkage`.
 *
 * The default is **Israel's full set**, not an empty one. Every account that existed before
 * countries did is Israeli, and the moment between first paint and the config arriving must
 * render what the app already did rather than a stripped-down version of it.
 */

export interface Capabilities {
  cpiLinkage: boolean;
  taxTracks: boolean;
  israeliPropertyTypes: boolean;
  bitPayments: boolean;
  structuredBankDetails: boolean;
}

const ISRAEL: Capabilities = {
  cpiLinkage: true,
  taxTracks: true,
  israeliPropertyTypes: true,
  bitPayments: true,
  structuredBankDetails: true,
};

let active: Capabilities = ISRAEL;

/**
 * Informational, not a capability: it never blocks anything and never turns a feature off.
 * It drives one line of copy on the renter form and a longer default term, because the
 * lease model cannot express "no end date" and saying so beats letting the user find out.
 *
 * Israel is false, so nothing changes there.
 */
let openEnded = false;

export function setOpenEndedTenancies(value: boolean): void {
  openEnded = value;
}

export function isOpenEndedCountry(): boolean {
  return openEnded;
}

export function setActiveCapabilities(capabilities: Capabilities): void {
  active = capabilities;
}

export function capabilities(): Capabilities {
  return active;
}

/**
 * Filters a list of options down to the ones this country can actually use.
 *
 * Takes the *predicate per option* rather than a hardcoded exclusion list, so a new
 * capability-gated option is a line here instead of a new branch at every call site.
 */
export function allowedModes<T extends string>(
  modes: readonly T[],
  gated: Partial<Record<T, keyof Capabilities>>,
): T[] {
  const caps = active;
  return modes.filter((mode) => {
    const requires = gated[mode];
    return requires === undefined || caps[requires];
  });
}
