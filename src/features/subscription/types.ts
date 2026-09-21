/**
 * The shape of `GET /subscription`.
 *
 * Mirrors `app/schemas/subscription.py`. **Nothing here is recomputed client-side** — the
 * band boundaries, which properties are locked, and whether a feature is included are all
 * resolved by the server. Deriving them here would put the boundaries in three codebases,
 * two of which ship on store review cycles and cannot be hotfixed when a price moves.
 */

/** Plan identifiers, as the backend's `entitlement_service` defines them. */
export type PlanId = 'free' | 'tier_3_8' | 'tier_9_15' | 'tier_16_plus';

/** Which rail sold the subscription — decides where "cancel" sends someone. */
export type BillingSource = 'apple' | 'google' | 'paddle' | 'unknown';

export interface Subscription {
  plan: PlanId;
  /** Inclusive property ceiling. `null` is unlimited, **never** zero. */
  limit: number | null;
  property_count: number;

  /** Over the ceiling: readable, not writable. */
  locked_property_ids: number[];
  /** Show the one-time over-limit explanation, then POST the ack. */
  show_lock_notice: boolean;

  /**
   * Whether the server is actually refusing writes. While false the plan is still
   * reported and can be displayed, but nothing is restricted — so the UI must not
   * present the account as limited.
   */
  enforced: boolean;

  source: BillingSource | null;
  status: string | null;
  period: 'monthly' | 'yearly' | null;
  current_period_end: string | null;
  price_amount: number | null;
  price_currency: string | null;

  /** Lease scans allowed per calendar month. `null` is unlimited. */
  monthly_lease_scans: number | null;
  lease_scans_used: number;
  /** Whether the plan includes the chat assistant. */
  agent: boolean;
}

/** The body of a 402 from any gated write. */
export interface PlanLimitError {
  error:
    | 'plan_limit_reached'
    | 'property_locked'
    | 'scan_limit_reached'
    | 'agent_not_included';
  current_plan: PlanId;
  required_plan: PlanId;
  current_count?: number;
  limit?: number | null;
  used?: number;
  property_id?: number;
  locked_property_ids?: number[];
  resets_at?: string;
}
