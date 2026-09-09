import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { AddMenu } from '@/shared/components/ui/AddMenu';
import { RenterMiniCard } from './RenterMiniCard';
import { getRenterLifecycle } from '@/shared/utils/renterStatus';
import type { Property } from '@/shared/types';

interface Props {
  property: Property;
  onAddRenter: () => void;
  /** When provided, the add action becomes a chooser (manual / scan a lease). */
  onScanRenter?: () => void;
}

export function PropertyRentersTab({ property, onAddRenter, onScanRenter }: Props) {
  const { t } = useTranslation();
  const [showPrevious, setShowPrevious] = useState(false);
  const allRenters = property.renters ?? [];
  // Past tenants stay on the property - they are the only record of who was here and what
  // they paid - but they are folded away so the tab reads as "who is here now".
  const renters = allRenters.filter((r) => getRenterLifecycle(r) !== 'ended');
  const previousRenters = allRenters.filter((r) => getRenterLifecycle(r) === 'ended');

  const addLabel = t('property.addRenterAction');

  // Sits in the grid as the tile after the last renter, wearing the cards' own surface and
  // outline so it reads as "one more of these" - but dashed, so it reads as a slot to fill
  // rather than a card that failed to load. 76px is the card's exact height (p-4's 32 plus
  // the 44px avatar), which keeps it square instead of stretching across a 360px column.
  //
  // The glyph is grey, not primary: the hero above already owns the page's blue button, and
  // two of those compete over which is *the* action here. It darkens on hover so a muted
  // control still answers the pointer. The label rides on aria-label and the tooltip, since
  // the face is just a +.
  const addTile = (
    <button
      aria-label={addLabel}
      title={addLabel}
      onClick={onScanRenter ? undefined : onAddRenter}
      className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] outline-none"
      style={{ cursor: 'pointer' }}
    >
      <Plus size={28} strokeWidth={2.25} />
    </button>
  );

  // Scanning is an input method of Add, so the tile opens the same chooser the list pages
  // use rather than jumping straight to the blank form.
  const addAction = onScanRenter ? (
    <AddMenu label={addLabel} onManual={onAddRenter} onScan={onScanRenter} trigger={addTile} />
  ) : (
    addTile
  );

  if (allRenters.length === 0) {
    return (
      <EmptyState
        icon={undefined}
        title={t('property.noRentersYet')}
        description={t('property.noRentersDesc')}
        action={
          onScanRenter ? (
            <AddMenu label={addLabel} onManual={onAddRenter} onScan={onScanRenter} />
          ) : (
            <button
              onClick={onAddRenter}
              className="flex items-center gap-1.5 h-9 px-4 rounded-[9px] text-sm font-semibold text-white hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={14} /> {addLabel}
            </button>
          )
        }
      />
    );
  }

  const cards = (list: typeof allRenters, trailing?: ReactNode) => (
    // `minmax(360px, …)` overflows on 360px-wide devices; below `sm` use a single column.
    <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(360px,1fr))]">
      {list.map((r) => (
        <RenterMiniCard
          key={r.id}
          renter={r}
          backTo={`/properties/${property.id}?tab=renters`}
          backLabel={property.address}
        />
      ))}
      {trailing}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {renters.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('property.noCurrentRenters')}
        </p>
      )}

      {cards(renters, addAction)}

      {previousRenters.length > 0 && (
        <div>
          <button
            onClick={() => setShowPrevious((v) => !v)}
            aria-expanded={showPrevious}
            className="flex items-center gap-1.5 py-1.5 text-[13px] font-medium transition-colors"
            style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
          >
            {showPrevious ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            {t('renter.previousTenants')} ({previousRenters.length})
          </button>
          {showPrevious && <div className="mt-2.5">{cards(previousRenters)}</div>}
        </div>
      )}
    </div>
  );
}
