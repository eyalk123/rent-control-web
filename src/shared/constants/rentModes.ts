/**
 * How the rent changes over a lease, as a list and as a capability map.
 *
 * Here rather than on `RentChangeField` because the control is not the only reader: the scan
 * mapper needs the same map to decide whether a mode the scanner returned is one this country
 * can actually store, and a utility importing a React component to borrow a constant drags a
 * whole component tree into every module that touches it.
 */

import type { RentEscalationMode } from '@/shared/types';

/**
 * The escalation modes, in display order. Every caller offers all of them. `custom` leads
 * because it is the one that expresses a real lease — the other four are each a special case
 * of it. It is not the default; every caller sets `none` explicitly.
 */
export const RENT_ESCALATION_MODES: RentEscalationMode[] = ['custom', 'none', 'percent', 'fixed', 'cpi'];

/**
 * `cpi` needs an index source behind it; outside Israel there is none and the API refuses
 * the value. The array above keeps every mode, because an existing lease can still hold
 * `cpi` and must keep rendering — only the picker narrows.
 */
export const RENT_MODE_REQUIREMENTS: Partial<Record<RentEscalationMode, 'cpiLinkage'>> = {
  cpi: 'cpiLinkage',
};
