import * as Popover from '@radix-ui/react-popover';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { HeroStat } from '@/shared/components/detail/HeroStat';
import { formatMoney } from '@/shared/utils/money';
import { getCurrentMonthlyRent } from '@/shared/types';
import type { Renter } from '@/shared/types';

interface Props {
  renters: Renter[];
  /** First renter's full name (the tile headline). */
  renterName: string | null;
  rentersCount: number;
  /** Total current monthly rent across renters (matches the "Monthly rent" tile). */
  total: number | null;
}

/**
 * The hero "Renter" KPI tile. With 0–1 renters it is a plain {@link HeroStat}.
 * With 2+ renters it becomes a click-to-open popover breaking down each renter's
 * current monthly rent plus a total — so the parts add up to the hero's total,
 * per-renter rows use `getCurrentMonthlyRent` (current lease year), same basis as
 * `getTotalCurrentMonthlyRent`.
 */
export function RenterRentStat({ renters, renterName, rentersCount, total }: Props) {
  const { t, i18n } = useTranslation();

  if (rentersCount <= 1) {
    return <HeroStat label={t('property.renter')} value={renterName ?? t('property.occupancy.vacant')} />;
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className="px-5 py-4 text-start outline-none group">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
            {t('property.renter')}
          </p>
          <span
            className="text-[22px] font-bold mt-1 flex items-center gap-1 truncate group-hover:opacity-80 transition-opacity"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <span className="truncate">{renterName}</span>
            <ChevronDown size={16} className="shrink-0 transition-transform group-data-[state=open]:rotate-180" style={{ color: 'var(--color-text-secondary)' }} />
          </span>
          <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {t('property.plusMoreRenters', { count: rentersCount - 1 })}
          </p>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          dir={i18n.dir()}
          align="start"
          sideOffset={6}
          className="z-50 min-w-[16rem] rounded-xl border p-2 shadow-lg"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-outline)' }}
        >
          <p className="px-2 pt-1 pb-2 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
            {t('property.rentBreakdown')}
          </p>
          {renters.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-6 px-2 py-1.5">
              <span className="text-[13px] truncate" style={{ color: 'var(--color-text-primary)' }}>
                {r.first_name} {r.last_name}
              </span>
              <LtrSpan className="text-[13px] font-semibold shrink-0" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(getCurrentMonthlyRent(r))}
              </LtrSpan>
            </div>
          ))}
          <div className="flex items-center justify-between gap-6 px-2 py-1.5 mt-1 pt-2" style={{ borderTop: '1px solid var(--color-outline)' }}>
            <span className="text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {t('property.rentTotal')}
            </span>
            <LtrSpan className="text-[13px] font-bold shrink-0" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(total ?? 0)}
            </LtrSpan>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
