import { useTranslation } from 'react-i18next';
import { allowedModes } from '@/shared/utils/capabilities';
import { RENT_ESCALATION_MODES, RENT_MODE_REQUIREMENTS } from '@/shared/constants/rentModes';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { EscalationValueField } from '@/shared/components/form/EscalationValueField';
import { indexLabelKey, indexNoteKey } from '@/shared/utils/indexLabels';
import type { RentEscalationMode } from '@/shared/types';
import { ANCHORS } from '@/features/onboarding/anchors';
import { useTourAnchor } from '@/features/onboarding/AnchorRegistry';

interface Props {
  /** Caption above the toggle — the two callers word it differently (whole lease vs. new years). */
  label: string;
  mode: RentEscalationMode;
  onModeChange: (mode: RentEscalationMode) => void;
  /** Percent / ₪ step. Ignored (and hidden) in the none/cpi/custom modes. */
  value: string;
  onValueChange: (value: string) => void;
  onValueBlur?: () => void;
  /**
   * Narrows the list to the modes an endless lease can be priced by.
   *
   * Only `custom` drops out. It gives every year its own rule, and a rule cannot be written
   * for a year the generator has not appended yet, which is why the API refuses it
   * alongside the switch — offering it here would only produce a save the server rejects.
   *
   * Index linkage stays. It prices every period from the base index frozen at signing and
   * never asks where the schedule ends, so a month-to-month holdover can be index-linked
   * like any other tenancy. Where the country has no index the capability filter below has
   * already removed it, so the two narrowings compose without either knowing about the
   * other.
   */
  openEnded?: boolean;
  className?: string;
}

// Re-exported so the existing import path keeps working; both now live in constants.
export { RENT_ESCALATION_MODES, RENT_MODE_REQUIREMENTS };

/** The modes an open-ended lease can use — see the `openEnded` prop. */
const OPEN_ENDED_MODES = new Set<RentEscalationMode>(['none', 'percent', 'fixed', 'cpi']);

/**
 * The "how does the rent change" control: mode toggle + the CPI explainer + the percent/₪
 * step field. Shared by the renter form (LeaseTermBuilder, driven by RHF Controllers) and
 * the lease-extension drawer (driven by useState) so the two can't drift apart on which
 * modes exist or how each one is presented.
 */
export function RentChangeField({
  label,
  mode,
  onModeChange,
  value,
  onValueChange,
  onValueBlur,
  openEnded = false,
  className = '',
}: Props) {
  const { t } = useTranslation();
  // The lease-form tour seeds CPI and Custom from this control — neither mode is guessable
  // from its label alone. The lease-extension drawer renders this component too, so both
  // instances claim these keys; the registry resolves to whichever one is on screen.
  const anchorRef = useTourAnchor(ANCHORS.leaseRentChangeField);
  const cpiAnchorRef = useTourAnchor(ANCHORS.leaseCpiBase);

  const segments: { value: RentEscalationMode; label: string }[] = allowedModes(
    RENT_ESCALATION_MODES,
    RENT_MODE_REQUIREMENTS,
  )
    .filter((m) => !openEnded || OPEN_ENDED_MODES.has(m))
    .map((m) => ({
    value: m,
    label: t(
      {
        none: 'renter.rentChangeSame',
        percent: 'renter.rentChangePercent',
        fixed: 'renter.rentChangeFixed',
        // The one label the country has a say in: which index this market's leases are
        // linked to is a different concept, not a different wording. See `indexLabels.ts`.
        cpi: indexLabelKey(),
        custom: 'renter.rentChangeCustom',
      }[m],
    ),
  }));

  return (
    <div ref={anchorRef} className={`flex flex-col gap-1.5 ${className}`.trim()}>
      <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
      <SegToggle value={mode} onChange={onModeChange} options={segments} />

      {/* The CPI elaboration opens here. Picking CPI replaces the value field with this
          note, so the note is the only thing on screen for the tour to point at. */}
      {mode === 'cpi' && (
        <p
          ref={cpiAnchorRef}
          className="text-[13px] leading-snug mt-1.5 text-[var(--color-text-secondary)]"
        >
          {t(indexNoteKey())}
        </p>
      )}

      {(mode === 'percent' || mode === 'fixed') && (
        <EscalationValueField
          mode={mode}
          value={value}
          onChange={onValueChange}
          onBlur={onValueBlur}
          className="mt-2"
        />
      )}
    </div>
  );
}
