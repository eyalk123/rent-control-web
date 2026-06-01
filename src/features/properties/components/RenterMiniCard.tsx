import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { formatMoney } from '@/shared/utils/money';
import { getPropertyColor, getPropertyColorBg } from '@/shared/utils/propertyColor';
import { getRenterMonthlyRent, getLeaseEndDate } from '@/shared/types';
import type { Renter } from '@/shared/types';

interface Props {
  renter: Renter;
}

function leaseCountdown(renter: Renter): { days: number } | 'expired' | null {
  const d = getLeaseEndDate(renter);
  if (!d) return null;
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  return days > 0 ? { days } : 'expired';
}

export function RenterMiniCard({ renter }: Props) {
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  const navigate = useNavigate();
  const color = getPropertyColor(renter.id);
  const bg = getPropertyColorBg(renter.id);
  const monthly = getRenterMonthlyRent(renter);
  const countdown = leaseCountdown(renter);
  const countdownStr = countdown === 'expired'
    ? t('renter.leaseExpired')
    : countdown ? t('property.endsIn', { countdown: `${countdown.days}d` }) : null;

  return (
    <button
      onClick={() => navigate(`/renters/${renter.id}`)}
      className="flex items-center gap-3.5 p-4 rounded-[var(--radius-card)] text-start w-full transition-colors hover:opacity-90"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: bg, color }}>
        {(renter.first_name[0] + renter.last_name[0]).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{renter.first_name} {renter.last_name}</p>
        </div>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          <LtrSpan>{formatMoney(monthly)}</LtrSpan>/mo{countdownStr ? ` · ${countdownStr}` : ''}
        </p>
      </div>
      {isRtl ? <ChevronLeft size={15} style={{ color: 'var(--color-text-secondary)' }} /> : <ChevronLeft size={15} className="rotate-180" style={{ color: 'var(--color-text-secondary)' }} />}
    </button>
  );
}
