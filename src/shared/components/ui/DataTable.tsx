import { usePersistedState } from '@/hooks/usePersistedState';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type RowData,
  type SortingState,
  type Table,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sortOptions } from '@/shared/utils/sortOptions';
import { TriStateCheckbox } from './TriStateCheckbox';

/**
 * A group row (a building) is structure, not an action, so it is marked in the table's own
 * neutrals rather than the accent colour: the header's grey wash, and — once
 * open — a hairline running down from its chevron through the member rows, ending halfway
 * into the last one, so it is clear which rows belong to it. What the group *is* (several
 * units) is said by the caller's group cell, not by colour here.
 */
const GROUP_BG = 'var(--color-input-filled-background)';
/** Horizontal centre of the chevron: the cell's 16px padding plus half its 24px box. */
const GUIDE_OFFSET = 27.5;

// Per-column UI hints, read by the DataTable filter row.
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Which filter control to render in the filter row. Omit for no filter. */
    filter?: 'text' | 'select';
    /** Options for `filter: 'select'`. */
    filterOptions?: { value: string; label: string }[];
    /** Placeholder for `filter: 'text'`. */
    filterPlaceholder?: string;
  }
}

/**
 * Headless TanStack table instance + the local UI state (sorting, column
 * filters, filter-row visibility) the DataTable needs. Created in the page so
 * the page can read the visible rows (e.g. to drive bulk-selection).
 *
 * Pass a stable `persistKey` (e.g. 'renters') to remember the sort and column
 * filters across navigation within the browsing session (sessionStorage); omit
 * it and the state is ephemeral as before.
 */
export function useDataTable<T>(
  columns: ColumnDef<T, unknown>[],
  data: T[],
  initialSorting: SortingState = [],
  persistKey?: string,
) {
  const [sorting, setSorting] = usePersistedState<SortingState>(
    persistKey ? `app_table_sort:${persistKey}` : null,
    initialSorting,
  );
  const [columnFilters, setColumnFilters] = usePersistedState<ColumnFiltersState>(
    persistKey ? `app_table_filters:${persistKey}` : null,
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableSortingRemoval: true, // 3rd click clears the sort
  });

  return { table };
}

interface DataTableProps<T> {
  table: Table<T>;
  /** Stable row id used for selection. */
  rowId: (row: T) => number;
  onRowClick?: (row: T) => void;
  // Selection (optional — mirrors useSelectMode)
  isSelectMode?: boolean;
  selectedIds?: Set<number>;
  allSelected?: boolean;
  someSelected?: boolean;
  onToggle?: (id: number) => void;
  onToggleAll?: () => void;
  /**
   * Attached to the first row only. The onboarding tour points at one row rather than the
   * table, whose height grows without bound and takes the highlight off-screen with it.
   */
  firstRowRef?: (el: HTMLElement | null) => void;
  /**
   * Rows sharing a non-null key collapse under one summary row — but only when two or more
   * of them survive the filters. Grouping runs on the filtered, sorted row model, so filters
   * and sort behave exactly as without it: rows keep their sorted order inside a group, and
   * each group sits where its highest-ranked row would.
   */
  groupBy?: (row: T) => string | null;
  /** Summary-row content for one column, given the group's visible rows. */
  renderGroupCell?: (columnId: string, rows: T[]) => ReactNode;
  /** Remembers which groups are open for the browsing session. Omit for ephemeral state. */
  groupPersistKey?: string;
}

type RenderItem<T> =
  | { kind: 'row'; row: Row<T> }
  | { kind: 'group'; key: string; rows: Row<T>[] };

function buildItems<T>(rows: Row<T>[], groupBy?: (row: T) => string | null): RenderItem<T>[] {
  if (!groupBy) return rows.map((row) => ({ kind: 'row', row }));
  const byKey = new Map<string, Row<T>[]>();
  const keys = rows.map((row) => {
    const key = groupBy(row.original);
    if (key !== null) byKey.set(key, [...(byKey.get(key) ?? []), row]);
    return key;
  });
  const items: RenderItem<T>[] = [];
  const emitted = new Set<string>();
  rows.forEach((row, i) => {
    const key = keys[i];
    const members = key === null ? undefined : byKey.get(key);
    if (key === null || !members || members.length < 2) {
      items.push({ kind: 'row', row });
    } else if (!emitted.has(key)) {
      emitted.add(key);
      items.push({ kind: 'group', key, rows: members });
    }
  });
  return items;
}

const TH_CLASS =
  'px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider';

export function DataTable<T>({
  table,
  rowId,
  onRowClick,
  isSelectMode = false,
  selectedIds,
  allSelected = false,
  someSelected = false,
  onToggle,
  onToggleAll,
  firstRowRef,
  groupBy,
  renderGroupCell,
  groupPersistKey,
}: DataTableProps<T>) {
  const { t, i18n } = useTranslation();
  const rows = table.getRowModel().rows;
  const items = buildItems(rows, groupBy);
  // Collapsed by default: only the keys of open groups are stored.
  const [openGroups, setOpenGroups] = usePersistedState<string[]>(
    groupPersistKey ? `app_table_groups:${groupPersistKey}` : null,
    [],
  );
  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  // Running index over every rendered <tr>, so borders and the tour anchor follow what is
  // actually on screen rather than the row model.
  let rendered = 0;
  const renderRow = (row: Row<T>, nested: boolean, lastInGroup = false) => {
    const i = rendered++;
    const id = rowId(row.original);
    const selected = selectedIds?.has(id) ?? false;
    return (
      <tr
        key={row.id}
        ref={i === 0 ? firstRowRef : undefined}
        onClick={() => (isSelectMode ? onToggle?.(id) : onRowClick?.(row.original))}
        className="cursor-pointer hover:bg-[var(--color-input-filled-background)] transition-colors"
        style={{
          borderTop: i > 0 ? '1px solid var(--color-subtle-outline)' : 'none',
          background: selected ? 'var(--color-input-filled-background)' : undefined,
        }}
      >
        {isSelectMode && (
          <td className="px-4 py-3"><TriStateCheckbox checked={selected} /></td>
        )}
        {row.getVisibleCells().map((cell, c) => (
          // Nested rows indent past the group's chevron so they read as its children.
          <td key={cell.id} className={nested && c === 0 ? 'relative ps-12 pe-4 py-3' : 'px-4 py-3'}>
            {nested && c === 0 && (
              <span
                aria-hidden
                className="absolute top-0 w-px"
                style={{ insetInlineStart: GUIDE_OFFSET, bottom: lastInGroup ? '50%' : 0, background: 'var(--color-outline)' }}
              />
            )}
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
    );
  };

  const renderGroup = (key: string, groupRows: Row<T>[]) => {
    const i = rendered++;
    const open = openGroups.includes(key);
    const ids = groupRows.map((r) => rowId(r.original));
    const selectedCount = ids.filter((id) => selectedIds?.has(id)).length;
    const allIn = selectedCount === ids.length;
    // All selected → clear them all; otherwise select the rest.
    const toggleMembers = () => ids.forEach((id) => {
      if (allIn || !selectedIds?.has(id)) onToggle?.(id);
    });
    const originals = groupRows.map((r) => r.original);
    return (
      <tr
        key={`group:${key}`}
        ref={i === 0 ? firstRowRef : undefined}
        onClick={() => toggleGroup(key)}
        className="cursor-pointer hover:bg-[var(--color-input-filled-background)] transition-colors"
        style={{ borderTop: i > 0 ? '1px solid var(--color-subtle-outline)' : 'none', background: GROUP_BG }}
      >
        {isSelectMode && (
          <td className="px-4 py-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleMembers(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <TriStateCheckbox checked={allIn} indeterminate={selectedCount > 0 && !allIn} />
            </button>
          </td>
        )}
        {table.getVisibleLeafColumns().map((column, c) => (
          <td key={column.id} className={c === 0 && open ? 'relative px-4 py-3' : 'px-4 py-3'}>
            {c === 0 && open && (
              <span
                aria-hidden
                className="absolute bottom-0 w-px"
                style={{ insetInlineStart: GUIDE_OFFSET, top: 'calc(50% + 12px)', background: 'var(--color-outline)' }}
              />
            )}
            {c === 0 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={open ? t('common.collapseGroup') : t('common.expandGroup')}
                  onClick={(e) => { e.stopPropagation(); toggleGroup(key); }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px]"
                  style={{ background: 'none', color: 'var(--color-text-secondary)', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <ChevronRight
                    size={16}
                    className="transition-transform rtl:-scale-x-100"
                    style={{ transform: open ? 'rotate(90deg)' : undefined }}
                  />
                </button>
                <div className="min-w-0">{renderGroupCell?.(column.id, originals)}</div>
              </div>
            ) : (
              renderGroupCell?.(column.id, originals)
            )}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div
      className="rounded-[var(--radius-card)] overflow-x-auto"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
    >
      <table className="w-full text-sm border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              style={{ borderBottom: '1px solid var(--color-outline)', background: 'var(--color-input-filled-background)' }}
            >
              {isSelectMode && (
                <th className="px-4 py-3 w-px">
                  <button
                    type="button"
                    onClick={onToggleAll}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <TriStateCheckbox checked={allSelected} indeterminate={someSelected} />
                  </button>
                </th>
              )}
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                const label = flexRender(header.column.columnDef.header, header.getContext());
                return (
                  <th key={header.id} className={TH_CLASS} style={{ color: 'var(--color-text-secondary)' }}>
                    {canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 uppercase tracking-wider select-none"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', font: 'inherit' }}
                      >
                        {label}
                        {sorted === 'asc' ? (
                          <ChevronUp size={13} style={{ color: 'var(--color-text-primary)' }} />
                        ) : sorted === 'desc' ? (
                          <ChevronDown size={13} style={{ color: 'var(--color-text-primary)' }} />
                        ) : (
                          <ChevronsUpDown size={13} style={{ opacity: 0.4 }} />
                        )}
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
          {/* Per-column filter row — always visible. */}
          <tr style={{ borderBottom: '1px solid var(--color-outline)', background: 'var(--color-input-filled-background)' }}>
            {isSelectMode && <th className="px-4 pt-3 pb-3.5 w-px" />}
              {table.getHeaderGroups()[0]?.headers.map((header) => {
                const meta = header.column.columnDef.meta;
                const value = (header.column.getFilterValue() as string) ?? '';
                return (
                  <th key={header.id} className="px-4 pt-3 pb-3.5 align-top">
                    {meta?.filter === 'text' && (
                      <input
                        value={value}
                        onChange={(e) => header.column.setFilterValue(e.target.value)}
                        placeholder={meta.filterPlaceholder}
                        className="h-7 w-full min-w-[90px] rounded-[7px] px-2 text-[12px] font-normal normal-case tracking-normal outline-none"
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-outline)',
                          color: 'var(--color-text-primary)',
                        }}
                      />
                    )}
                    {meta?.filter === 'select' && (
                      <select
                        value={value}
                        onChange={(e) => header.column.setFilterValue(e.target.value || undefined)}
                        className="h-7 w-full min-w-[90px] rounded-[7px] px-1.5 text-[12px] font-normal normal-case tracking-normal outline-none"
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-outline)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        <option value="">{meta.filterPlaceholder ?? ''}</option>
                        {sortOptions(meta.filterOptions ?? [], i18n.language).map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                  </th>
                );
              })}
          </tr>
        </thead>
        <tbody>
          {items.map((item) =>
            item.kind === 'row'
              ? renderRow(item.row, false)
              : [
                  renderGroup(item.key, item.rows),
                  ...(openGroups.includes(item.key)
                    ? item.rows.map((r, k) => renderRow(r, true, k === item.rows.length - 1))
                    : []),
                ],
          )}
        </tbody>
      </table>
    </div>
  );
}
