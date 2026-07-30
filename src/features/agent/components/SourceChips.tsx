import { useNavigate } from 'react-router-dom';
import { Home, User, Receipt } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatPanel } from '../PortfolioChatContext';
import type { SourceRef, SourceRefType } from '../types';

const ROUTE: Record<SourceRefType, (id: number) => string> = {
  renter: (id) => `/renters/${id}`,
  property: (id) => `/properties/${id}`,
  transaction: (id) => `/transactions/${id}`,
};

const ICON: Record<SourceRefType, typeof User> = {
  renter: User,
  property: Home,
  transaction: Receipt,
};

/** Deliberate, out-of-prose source chips. Tapping one navigates to the record and closes
 *  the panel (like AlertsPanel) — never inline links, so no accidental navigation. */
export function SourceChips({ sources }: { sources: SourceRef[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { close } = useChatPanel();
  if (sources.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-[var(--color-text-secondary)]">{t('agent.sources')}</span>
      {sources.map((s) => {
        const Icon = ICON[s.type];
        return (
          <button
            key={`${s.type}:${s.id}`}
            type="button"
            onClick={() => {
              navigate(ROUTE[s.type](s.id));
              close();
            }}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-outline)] bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-input-filled-background)] hover:text-[var(--color-text-primary)]"
          >
            <Icon size={12} aria-hidden="true" />
            <bdi>{s.label}</bdi>
          </button>
        );
      })}
    </div>
  );
}
