import type {
  LeaseYear,
  LeaseYearRule,
  LeaseYearType,
  RentEscalationMode,
} from '@/shared/types';

/**
 * Lease schedule helpers.
 *
 * The renter form lets the user express lease terms as *intent* — a contract
 * term, optional renewal years, a first-year rent and an escalation rule — and
 * materializes that intent into the canonical `lease_years: { amount, type }[]`
 * array the rest of the app consumes. These pure helpers do that translation in
 * both directions so the builder UI and the edit-hydration path share one
 * source of truth.
 */

export type { RentEscalationMode } from '@/shared/types';

export interface LeaseScheduleInput {
  /** Number of binding (contract) years — always first in the schedule. */
  contractYears: number;
  /** Number of renewal (option) years — appended after the contract years. */
  optionYears: number;
  /** First-year monthly rent. */
  baseRent: number;
  escalationMode: RentEscalationMode;
  /** Percent (for "percent") or ₪ amount (for "fixed") added each year. */
  escalationValue: number;
}

function toCount(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Rent for lease-year `index` (0-based) under the given escalation rule. */
export function rentForYear(
  baseRent: number,
  index: number,
  escalationMode: RentEscalationMode,
  escalationValue: number,
): number {
  const base = Number.isFinite(baseRent) && baseRent > 0 ? baseRent : 0;
  const step = Number.isFinite(escalationValue) ? escalationValue : 0;
  if (index <= 0) return base;
  switch (escalationMode) {
    case 'percent':
      return Math.round(base * Math.pow(1 + step / 100, index));
    case 'fixed':
      return Math.round(base + step * index);
    // "none"/"custom" carry flat or hand-edited amounts; "cpi" amounts are computed
    // server-side from the published index, so the client projects a flat base rent
    // until the server fills real amounts in.
    case 'none':
    case 'custom':
    case 'cpi':
    default:
      return base;
  }
}

/* --- Per-year rules ("custom" mode) ------------------------------------------------
 *
 * In `custom` mode every year past the first carries its own `rule` and derives from the
 * *previous year's* amount, which makes the schedule a forward walk. That is what lets a
 * percent year sit after a CPI year: by the time the walk reaches it, the CPI year's
 * amount is already settled.
 *
 * The client cannot price a CPI year — the index for that anniversary may not be
 * published yet — so here CPI projects flat (`prev`) and the row renders muted with a "≈".
 * The server owns the real numbers (see `materialize_ruled_lease_years` in
 * `cpi_indexing_service.py`) and overwrites them on save and on every indexing run.
 */

/** Rent for one lease year from its rule and the previous year's amount. */
export function applyYearRule(
  prevAmount: number,
  currentAmount: number,
  rule: LeaseYearRule | undefined,
): number {
  const prev = Number.isFinite(prevAmount) ? prevAmount : 0;
  const value = Number.isFinite(rule?.value) ? (rule?.value as number) : 0;
  switch (rule?.mode) {
    case 'none':
      return Math.round(prev);
    case 'percent':
      return Math.round(prev * (1 + value / 100));
    case 'fixed':
      return Math.round(prev + value);
    case 'cpi':
      // Unknowable in the browser — project flat and let the server settle it.
      return Math.round(prev);
    default:
      return Math.round(Number.isFinite(currentAmount) ? currentAmount : 0); // manual
  }
}

/**
 * Walks a `custom` schedule forward, resolving each ruled year's amount from the one
 * before it. Year one is always the base rent; `manual` (and rule-less, i.e. legacy) years
 * keep the amount they already hold. `type` and `rule` pass through untouched.
 */
export function materializeRuledYears(rows: LeaseYear[], baseRent: number): LeaseYear[] {
  if (rows.length === 0) return [];
  const base = Number.isFinite(baseRent) && baseRent > 0 ? baseRent : rows[0]?.amount ?? 0;
  const result: LeaseYear[] = [];
  let prev = base;
  rows.forEach((row, i) => {
    const amount = i === 0 ? Math.round(base) : applyYearRule(prev, row.amount, row.rule);
    result.push({ ...row, amount });
    prev = amount;
  });
  return result;
}

/**
 * Index of the first CPI-linked year, or -1. That year and every year after it are
 * *projections* — their amounts depend on an index reading the client doesn't have — so the
 * rows from here on render with `LeaseYearRow`'s `projected` styling.
 */
export function firstCpiIndex(rows: LeaseYear[]): number {
  return rows.findIndex((r) => r.rule?.mode === 'cpi');
}

/** True when row `index` should render as a projection. */
export function isProjectedYear(rows: LeaseYear[], index: number): boolean {
  const cpiAt = firstCpiIndex(rows);
  return cpiAt !== -1 && index >= cpiAt;
}

/**
 * Builds the materialized lease-year schedule from term intent. The Contract /
 * Option split is always positional — the first `contractYears` are `contract`,
 * the rest `option` — so it is fully owned by the steppers. Only the *amount*
 * varies by mode: `custom` walks each year's own rule forward (preserving hand-typed
 * amounts), other modes derive it from the whole-lease escalation rule.
 */
export function buildLeaseYears(
  input: LeaseScheduleInput,
  existingRows?: LeaseYear[],
  opts?: { resetCpiAmounts?: boolean },
): LeaseYear[] {
  const contract = toCount(input.contractYears);
  const option = toCount(input.optionYears);
  const total = contract + option;
  if (total === 0) return [];

  const base = Number.isFinite(input.baseRent) && input.baseRent > 0 ? input.baseRent : 0;
  // In "custom" mode the user hand-edits per-year amounts (or gives the year a rule); in
  // "cpi" mode the server owns them (index-linked). Both preserve any existing row amount
  // rather than re-deriving it from the whole-lease formula, so re-materializing never
  // clobbers real values. Exception: a fresh in-form switch into CPI (`resetCpiAmounts`)
  // must drop the previous mode's amounts and project the flat base instead.
  const isCustom = input.escalationMode === 'custom';
  const preserveExisting =
    isCustom || (input.escalationMode === 'cpi' && !opts?.resetCpiAmounts);
  const result: LeaseYear[] = [];
  for (let i = 0; i < total; i += 1) {
    const type: LeaseYearType = i < contract ? 'contract' : 'option';
    const amount = preserveExisting
      ? existingRows?.[i]?.amount ?? base
      : rentForYear(base, i, input.escalationMode, input.escalationValue);
    // Rules only exist in custom mode; leaving it drops them.
    const rule = isCustom ? existingRows?.[i]?.rule : undefined;
    result.push(rule ? { amount, type, rule } : { amount, type });
  }
  // Re-price the ruled years off the (possibly new) base rent and each other.
  return isCustom ? materializeRuledYears(result, base) : result;
}

/**
 * Builds the rows to append when *extending* an existing lease. Unlike
 * {@link buildLeaseYears} (which materializes a whole schedule from intent), this
 * keeps the existing years untouched and computes each new year's rent by walking
 * the escalation rule forward from the **last existing amount** — so custom edits
 * already made to the schedule carry into the extension. The added block is
 * `contractAdd` contract years followed by `optionAdd` option years (contract
 * first, so the natural order is preserved within the new block); pricing walks the
 * escalation rule continuously across both.
 */
export function buildAddedYears(
  existingYears: LeaseYear[],
  contractAdd: number,
  optionAdd: number,
  escalationMode: RentEscalationMode,
  escalationValue: number,
  existingAdded?: LeaseYear[],
): LeaseYear[] {
  const contract = toCount(contractAdd);
  const option = toCount(optionAdd);
  const total = contract + option;
  if (total === 0) return [];
  const lastAmount = existingYears.length > 0 ? existingYears[existingYears.length - 1].amount : 0;

  if (escalationMode === 'custom') {
    // Each added year carries its own rule and prices off the year before it — the first
    // one off the last *existing* year, so the walk is continuous across the join. Rules
    // and hand-typed amounts already entered for the added block are preserved.
    const rows: LeaseYear[] = [];
    for (let i = 0; i < total; i += 1) {
      const prior = existingAdded?.[i];
      rows.push({
        amount: prior?.amount ?? lastAmount,
        type: i < contract ? 'contract' : 'option',
        ...(prior?.rule ? { rule: prior.rule } : {}),
      });
    }
    // Walk existing + added together, then keep only the added tail.
    return materializeRuledYears([...existingYears, ...rows], existingYears[0]?.amount ?? 0).slice(
      existingYears.length,
    );
  }

  const added: LeaseYear[] = [];
  for (let i = 1; i <= total; i += 1) {
    added.push({
      amount: rentForYear(lastAmount, i, escalationMode, escalationValue),
      type: i <= contract ? 'contract' : 'option',
    });
  }
  return added;
}

/**
 * True when a contract (binding) year appears *after* an option (renewal) year —
 * an invalid lease order. A valid schedule is a run of contract years followed by a
 * run of option years. Used to warn the owner rather than auto-restructure.
 */
export function hasContractAfterOptionYear(years: LeaseYear[]): boolean {
  let seenOption = false;
  for (const y of years) {
    if (y.type === 'option') seenOption = true;
    else if (seenOption) return true;
  }
  return false;
}

export interface ReconstructedIntent {
  contractTermYears: number;
  optionYears: number;
  baseRent: number;
  escalationMode: RentEscalationMode;
}

/**
 * Recovers term intent from an existing `lease_years` array — used on edit when
 * the backend has not (yet) persisted the structured fields. A schedule carrying per-year
 * rules is "custom" by definition. Otherwise a uniform schedule reads as "none"; anything
 * else is treated as "custom" so the exact saved amounts are preserved rather than
 * re-derived.
 */
export function reconstructIntentFromLeaseYears(
  leaseYears: LeaseYear[] | undefined,
): ReconstructedIntent {
  const years = leaseYears ?? [];
  const contractTermYears = years.filter((y) => y.type === 'contract').length;
  const optionYears = years.filter((y) => y.type === 'option').length;
  const baseRent = years[0]?.amount ?? 0;
  const hasRules = years.some((y) => y.rule && y.rule.mode !== 'manual');
  const allEqual = years.length > 0 && years.every((y) => y.amount === baseRent);
  const escalationMode: RentEscalationMode =
    hasRules ? 'custom' : years.length === 0 || allEqual ? 'none' : 'custom';
  return { contractTermYears, optionYears, baseRent, escalationMode };
}
