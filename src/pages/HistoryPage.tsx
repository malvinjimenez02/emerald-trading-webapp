import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import type { SortingState, ColumnFiltersState } from '@tanstack/react-table';
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, Trash2, Eye, X,
} from 'lucide-react';
import { useTradeStore } from '../stores/useTradeStore';
import { useDateFilterStore } from '../stores/useDateFilterStore';
import { ActiveFilterBanner } from '../components/layout/ActiveFilterBanner';
import type { Trade } from '../types/trade';
import { TradeDirection, TradeResult } from '../types/trade';
import { formatCurrency, formatDate } from '../utils/formatters';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const col = createColumnHelper<Trade>();

function RBadge({ result }: { result: TradeResult }) {
  const map = {
    [TradeResult.Win]:  'bg-positive/10 text-positive',
    [TradeResult.Loss]: 'bg-negative/10 text-negative',
    [TradeResult.Open]: 'bg-warning/10 text-warning',
  };
  const label = {
    [TradeResult.Win]:  'W',
    [TradeResult.Loss]: 'L',
    [TradeResult.Open]: 'BE',
  };
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${map[result]}`}>
      {label[result]}
    </span>
  );
}

function DirBadge({ dir }: { dir: TradeDirection }) {
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
      dir === TradeDirection.Long
        ? 'bg-positive/10 text-positive'
        : 'bg-negative/10 text-negative'
    }`}>
      {dir === TradeDirection.Long ? 'Long' : 'Short'}
    </span>
  );
}

const selectClass =
  'bg-bg border border-divider rounded-[10px] px-3 py-2 text-[13px] text-text focus:outline-none focus:border-accent transition-colors cursor-pointer';

// ─── Delete confirm dialog ────────────────────────────────────────────────────

interface DeleteDialogProps {
  trade: Trade;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ trade, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
    <div className="bg-bg-surface rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
      <h3 className="text-[16px] font-bold text-text mb-2">Delete Trade</h3>
      <p className="text-[14px] text-text-secondary mb-6">
        Delete <span className="text-text font-semibold">{trade.assetName}</span>? This action cannot be undone.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-[10px] border border-divider text-text-secondary hover:bg-bg-secondary transition-colors text-[14px] font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-[10px] bg-negative text-white hover:bg-negative/80 transition-colors text-[14px] font-semibold"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ─── HistoryPage ──────────────────────────────────────────────────────────────

interface Filters {
  search:    string;
  direction: '' | TradeDirection;
  result:    '' | TradeResult;
}

const EMPTY_FILTERS: Filters = { search: '', direction: '', result: '' };

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { trades: allTrades, deleteTrade } = useTradeStore();
  const { getFilteredTrades, preset, startDate, endDate } = useDateFilterStore();

  const [filters, setFilters]           = useState<Filters>(EMPTY_FILTERS);
  const [sorting, setSorting]           = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [columnFilters]                 = useState<ColumnFiltersState>([]);
  const [deleteTarget, setDeleteTarget] = useState<Trade | null>(null);

  const setFilter = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters(prev => ({ ...prev, [key]: val }));

  const hasLocalFilters = Object.values(filters).some(v => v !== '');

  // 1. Apply global date filter
  const dateFiltered = useMemo(
    () => getFilteredTrades(allTrades),
    [allTrades, preset, startDate, endDate], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // 2. Apply local filters on top
  const filtered = useMemo(() => {
    return dateFiltered.filter(t => {
      if (filters.search    && !t.assetName.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.direction && t.direction !== filters.direction) return false;
      if (filters.result    && t.result    !== filters.result)    return false;
      return true;
    });
  }, [dateFiltered, filters]);

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns = useMemo(() => [
    col.accessor('assetName', {
      header: 'Asset',
      cell: info => <span className="font-semibold text-text">{info.getValue()}</span>,
    }),

    col.accessor('direction', {
      header: 'Direction',
      cell: info => <DirBadge dir={info.getValue()} />,
    }),

    col.accessor('entryPrice', {
      header: 'Entry',
      enableSorting: false,
      cell: info => <span className="tabular-nums text-text-secondary">{info.getValue().toPrecision(5)}</span>,
    }),

    col.accessor('stopLoss', {
      header: 'Stop Loss',
      enableSorting: false,
      cell: info => <span className="tabular-nums text-text-secondary">{info.getValue().toPrecision(5)}</span>,
    }),

    col.accessor('exitPrice', {
      header: 'Exit',
      enableSorting: false,
      cell: info => {
        const v = info.getValue();
        return <span className="tabular-nums text-text-secondary">{v != null ? v.toPrecision(5) : '—'}</span>;
      },
    }),

    col.accessor('rValue', {
      header: 'R Value',
      cell: info => {
        const v = info.getValue();
        if (v == null) return <span className="text-text-secondary">—</span>;
        const isLoss = info.row.original.result === TradeResult.Loss;
        const display = isLoss ? -Math.abs(v) : v;
        const pos = display >= 0;
        return (
          <span className={`tabular-nums font-semibold ${pos ? 'text-positive' : 'text-negative'}`}>
            {pos ? '+' : ''}{display.toFixed(2)}R
          </span>
        );
      },
    }),

    col.accessor('pnlAmount', {
      header: 'P&L',
      cell: info => {
        const v = info.getValue();
        if (v == null) return <span className="text-text-secondary">—</span>;
        const isLoss = info.row.original.result === TradeResult.Loss;
        const display = isLoss ? -Math.abs(v) : Math.abs(v);
        const pos = display >= 0;
        return (
          <span className={`tabular-nums font-semibold ${pos ? 'text-positive' : 'text-negative'}`}>
            {pos ? '+' : ''}{formatCurrency(display)}
          </span>
        );
      },
    }),

    col.accessor('result', {
      header: 'Result',
      cell: info => <RBadge result={info.getValue()} />,
    }),

    col.accessor('createdAt', {
      id: 'createdAt',
      header: 'Date',
      cell: info => {
        const date = info.row.original.entryDate ?? info.getValue();
        return <span className="text-text-secondary">{formatDate(date)}</span>;
      },
    }),

    col.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={e => { e.stopPropagation(); navigate(`/trade/${row.original.id}`); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:bg-bg-secondary hover:text-text transition-colors"
            title="View detail"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setDeleteTarget(row.original); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:bg-negative/10 hover:text-negative transition-colors"
            title="Delete trade"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    }),
  ], [navigate]);

  // ── Table instance ─────────────────────────────────────────────────────────

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalFiltered = filtered.length;
  const from = pageIndex * pageSize + 1;
  const to   = Math.min((pageIndex + 1) * pageSize, totalFiltered);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteTrade(deleteTarget.id);
    setDeleteTarget(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-text">Trade History</h1>
        <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-bg-surface text-text-secondary">
          {dateFiltered.length} trades
        </span>
      </div>

      <ActiveFilterBanner />

      {/* ── Local filters ── */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
          <input
            type="text"
            placeholder="Search asset…"
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
            className="bg-bg border border-divider rounded-[10px] pl-9 pr-3 py-2 text-[13px] text-text placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors w-48"
          />
        </div>

        {/* Direction */}
        <select
          value={filters.direction}
          onChange={e => setFilter('direction', e.target.value as Filters['direction'])}
          className={selectClass}
        >
          <option value="">All Directions</option>
          <option value={TradeDirection.Long}>Long</option>
          <option value={TradeDirection.Short}>Short</option>
        </select>

        {/* Result */}
        <select
          value={filters.result}
          onChange={e => setFilter('result', e.target.value as Filters['result'])}
          className={selectClass}
        >
          <option value="">All Results</option>
          <option value={TradeResult.Win}>Win</option>
          <option value={TradeResult.Loss}>Loss</option>
          <option value={TradeResult.Open}>Break Even</option>
        </select>

        {/* Clear local filters */}
        {hasLocalFilters && (
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[13px] text-text-secondary hover:text-text hover:bg-bg-secondary border border-divider transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-bg-surface rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="bg-bg-secondary border-b border-divider">
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary select-none"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center gap-1 ${header.column.getCanSort() ? 'cursor-pointer hover:text-text transition-colors' : ''}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="text-text-tertiary">
                            {header.column.getIsSorted() === 'asc'  ? <ChevronUp className="w-3 h-3" /> :
                             header.column.getIsSorted() === 'desc' ? <ChevronDown className="w-3 h-3" /> :
                             <ChevronsUpDown className="w-3 h-3" />}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-text-secondary text-[14px]">
                  {hasLocalFilters ? 'No trades match your filters.' : 'No trades in this period.'}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => navigate(`/trade/${row.original.id}`)}
                  className={`border-b border-divider/50 hover:bg-bg-secondary/50 transition-colors cursor-pointer text-[13px] ${
                    i % 2 === 0 ? 'bg-bg/30' : ''
                  }`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ── Pagination ── */}
        {totalFiltered > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-divider bg-bg-secondary/30">
            <span className="text-[13px] text-text-secondary">
              Showing <span className="text-text font-medium">{from}–{to}</span> of{' '}
              <span className="text-text font-medium">{totalFiltered}</span> trades
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[13px] font-medium border border-divider text-text-secondary hover:bg-bg-secondary hover:text-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <span className="text-[13px] text-text-secondary px-1">
                {pageIndex + 1} / {table.getPageCount()}
              </span>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[13px] font-medium border border-divider text-text-secondary hover:bg-bg-secondary hover:text-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete confirmation ── */}
      {deleteTarget && (
        <DeleteDialog
          trade={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
