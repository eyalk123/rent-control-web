import { useMemo, useState, type CSSProperties } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Download, FileArchive, FileText, Users } from 'lucide-react';
import { useAccessibleProperties } from '@/features/properties/queries';
import { TriStateCheckbox } from '@/shared/components/ui/TriStateCheckbox';
import type { ReportFormat } from '../api/reports';

import i18n from '@/core/i18n';

/**
 * Every property owner in the portfolio, exactly as typed — `''` is the no-owner group,
 * listed last. Exact rather than normalised because the report groups by the exact string:
 * "Dana Cohen" and "Dana  Cohen" are two owners there, so they are two options here.
 */
export function useReportOwners(): string[] {
  const { data: properties = [] } = useAccessibleProperties();
  return useMemo(() => {
    const owners = [...new Set(properties.map((p) => p.property_owner || ''))];
    return owners.sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, i18n.language)));
  }, [properties]);
}

/**
 * Which owners the report covers — the preview and the export alike.
 *
 * Kept in the URL (`only`), like the year and basis, so coming Back from a transaction
 * opened out of the report lands on the same selection. No `only` means every owner; a
 * stale name (an owner renamed since) is dropped, and a selection left empty by that falls
 * back to everyone rather than an empty report.
 */
export function useOwnerSelection(allOwners: string[]) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const picked = new Set(searchParams.getAll('only'));
  const filtered = allOwners.filter((o) => picked.has(o));
  const selected = searchParams.has('only') && filtered.length > 0 ? filtered : allOwners;
  const isAll = selected.length === allOwners.length;

  const setSelected = (owners: string[]) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('only');
      if (owners.length < allOwners.length) owners.forEach((o) => next.append('only', o));
      return next;
    }, { replace: true });

  /** The selected owners by name, for the subtitle, the download menu and the toast. */
  const names = selected.map((o) => o || t('reports.noOwner')).join(', ');
  return {
    allOwners,
    selected,
    isAll,
    setSelected,
    names,
    /** What the export endpoints take: `null` for every owner. */
    exportOwners: isAll ? null : selected,
  };
}

export type OwnerSelection = ReturnType<typeof useOwnerSelection>;

/**
 * Which owners go into the report. Labelled "Report for", not just a list of names, so it
 * reads as the report's scope — what is exported — rather than a view filter. Renders
 * nothing for a single-owner portfolio, which is most of them.
 */
export function OwnerExportPicker({ selection }: { selection: OwnerSelection }) {
  const { t } = useTranslation();
  const { allOwners, selected, isAll, setSelected } = selection;
  if (allOwners.length < 2) return null;

  const label = (o: string) => o || t('reports.noOwner');
  const toggle = (owner: string) => {
    const has = selected.includes(owner);
    // The last owner cannot be unticked: an empty report is never what anyone meant.
    if (has && selected.length === 1) return;
    const next = new Set(selected);
    if (has) next.delete(owner);
    else next.add(owner);
    setSelected(allOwners.filter((o) => next.has(o)));
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[9px] text-[13px] font-medium max-w-full"
          style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)', background: 'var(--color-surface)', cursor: 'pointer' }}
        >
          <Users size={14} className="shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
          <span className="shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.reportFor')}</span>
          <span className="truncate">
            {isAll
              ? t('reports.allOwners')
              : selected.length === 1
                ? label(selected[0])
                : t('reports.ownersSelected', { count: selected.length, total: allOwners.length })}
          </span>
          <ChevronDown size={14} className="shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          dir={i18n.dir()}
          align="start"
          sideOffset={4}
          collisionPadding={16}
          className="z-50 w-[19rem] rounded-xl border shadow-lg overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-outline)' }}
        >
          <div className="px-4 pt-3 pb-2" style={{ borderBottom: '1px solid var(--color-outline)' }}>
            <p className="text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{t('reports.owners')}</p>
            <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t('reports.ownersHint')}</p>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            <button
              type="button"
              role="checkbox"
              aria-checked={isAll ? true : 'mixed'}
              onClick={() => setSelected(allOwners)}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-start text-[13px] font-semibold hover:bg-[var(--color-input-filled-background)]"
              style={{ color: 'var(--color-text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <TriStateCheckbox checked={isAll} indeterminate={!isAll} />
              {t('reports.selectAllOwners')}
            </button>
            {allOwners.map((owner) => {
              const checked = selected.includes(owner);
              return (
                <button
                  key={owner}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggle(owner)}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-start text-[13px] hover:bg-[var(--color-input-filled-background)]"
                  style={{ color: owner ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <TriStateCheckbox checked={checked} />
                  <span className="truncate">{label(owner)}</span>
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * A PDF or CSV download button. In a single-owner portfolio it downloads straight away, as
 * it always has. With two or more owners it opens a short menu first, headed by who the
 * export covers — the point where the user commits, so the scope set by the owner picker
 * cannot go unnoticed — and offering one grouped file or, when the report covers more than
 * one owner, a ZIP with a file per owner.
 */
export function DownloadButton({ format, selection, busy, disabled, onDownload, className, style }: {
  format: ReportFormat;
  selection: OwnerSelection;
  /** True while this format's download is running. */
  busy: boolean;
  disabled: boolean;
  onDownload: (format: ReportFormat, split: boolean) => void;
  className: string;
  style: CSSProperties;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { allOwners, selected, isAll, names } = selection;
  const label = format.toUpperCase();
  const content = (
    <>
      <Download size={14} /> {busy ? '…' : label}
    </>
  );

  if (allOwners.length < 2) {
    return (
      <button type="button" onClick={() => onDownload(format, false)} disabled={disabled} className={className} style={style}>
        {content}
      </button>
    );
  }

  const choose = (split: boolean) => {
    setOpen(false);
    onDownload(format, split);
  };
  const item = 'flex w-full items-center gap-2.5 px-4 py-2.5 text-start text-[13px] font-medium hover:bg-[var(--color-input-filled-background)]';
  const itemStyle: CSSProperties = { color: 'var(--color-text-primary)', background: 'none', border: 'none', cursor: 'pointer' };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" disabled={disabled} className={className} style={style}>
          {content}
          <ChevronDown size={13} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          dir={i18n.dir()}
          align="end"
          sideOffset={4}
          collisionPadding={16}
          className="z-50 w-[18rem] rounded-xl border shadow-lg overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-outline)' }}
        >
          <div className="px-4 pt-3 pb-2.5" style={{ borderBottom: '1px solid var(--color-outline)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
              {t('reports.exporting')}
            </p>
            <p className="text-[13px] font-bold mt-0.5 break-words" style={{ color: 'var(--color-text-primary)' }}>
              {isAll ? t('reports.allOwners') : names}
            </p>
            {!isAll && (
              <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {t('reports.ownersSelected', { count: selected.length, total: allOwners.length })}
              </p>
            )}
          </div>
          <div className="py-1">
            <button type="button" onClick={() => choose(false)} className={item} style={itemStyle}>
              <FileText size={15} style={{ color: 'var(--color-text-secondary)' }} />
              {t('reports.oneFile')}
            </button>
            {selected.length > 1 && (
              <button type="button" onClick={() => choose(true)} className={item} style={itemStyle}>
                <FileArchive size={15} style={{ color: 'var(--color-text-secondary)' }} />
                <span>
                  {t('reports.filePerOwner')}
                  <span className="block text-[11.5px] font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('reports.filePerOwnerHint')}
                  </span>
                </span>
              </button>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
