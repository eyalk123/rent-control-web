import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowData,
  type SortingState,
  type Table,
} from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { TriStateCheckbox } from './TriStateCheckbox';

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
 */
export function useDataTable<T>(columns: ColumnDef<T, unknown>[], data: T[]) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

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
}: DataTableProps<T>) {
  const rows = table.getRowModel().rows;

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
                        {meta.filterOptions?.map((opt) => (
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
          {rows.map((row, i) => {
            const id = rowId(row.original);
            const selected = selectedIds?.has(id) ?? false;
            return (
              <tr
                key={row.id}
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
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
