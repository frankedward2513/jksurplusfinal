import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Calendar, ClipboardList, Filter, LoaderCircle, RefreshCw } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { supabase } from '../lib/supabase';
import { PAGE_SIZE, Pagination } from './Pagination';

interface ActivityLogEntry {
  id: number;
  table_name: string;
  record_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SALE' | 'LOST';
  actor_role: 'admin' | 'staff' | null;
  occurred_at: string;
}

function getLoadErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/audit_logs|schema cache|relation .* does not exist/i.test(message)) {
    return 'The activity log database setup is missing or outdated. Run supabase_activity_log.sql in your Supabase project SQL Editor, then refresh this page.';
  }
  if (/permission denied|row-level security|not allowed/i.test(message)) {
    return 'Supabase denied access to the activity log. Sign in as the admin account and confirm the admin policy in supabase_activity_log.sql has been applied.';
  }
  return message;
}

function formatAction(action: ActivityLogEntry['action']): string {
  switch (action) {
    case 'SALE':
      return 'Sales';
    case 'LOST':
      return 'Lost';
    case 'INSERT':
      return 'Add';
    case 'UPDATE':
      return 'Edit';
    case 'DELETE':
      return 'Delete';
  }
}

function formatRecord(entry: ActivityLogEntry): string {
  if (entry.action === 'LOST') return 'Log Lost Item';
  if (entry.action === 'SALE') return 'POS Sale';

  switch (entry.table_name) {
    case 'suppliers':
      return 'Supplier';
    case 'categories':
      return 'Category';
    case 'bales':
      return 'Bale';
    case 'products':
      return 'Product';
    case 'item_logs':
      return 'Inventory Log';
    case 'orders':
    case 'transactions':
      return 'POS Sale';
    default:
      return entry.table_name.replaceAll('_', ' ');
  }
}

export const ActivityLogView: React.FC = () => {
  const { currentUser } = useStore();
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'last7' | 'this_month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('audit_logs')
        .select('id, table_name, record_id, action, actor_role, occurred_at', {
          count: 'exact',
        });

      if (dateFilter !== 'all') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let end: Date | null = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        if (dateFilter === 'last7') {
          start.setDate(start.getDate() - 6);
        } else if (dateFilter === 'this_month') {
          start.setDate(1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        } else if (dateFilter === 'custom') {
          end = null;
          if (customStart) {
            const [year, month, day] = customStart.split('-').map(Number);
            start.setFullYear(year, month - 1, day);
          }
          if (customEnd) {
            const [year, month, day] = customEnd.split('-').map(Number);
            end = new Date(year, month - 1, day + 1);
          }
        }

        if (dateFilter !== 'custom' || customStart) {
          query = query.gte('occurred_at', start.toISOString());
        }
        if (end) query = query.lt('occurred_at', end.toISOString());
      }

      const { data, count, error: queryError } = await query
        .order('occurred_at', { ascending: false })
        .order('id', { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);
      if (queryError) throw queryError;
      setEntries((data ?? []) as ActivityLogEntry[]);
      setTotalEntries(count || 0);
    } catch (loadError) {
      setError(getLoadErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, dateFilter, customStart, customEnd]);

  useEffect(() => {
    if (currentUser.role === 'owner') void refresh();
  }, [currentUser.role, refresh]);

  const handleDateFilterChange = (filter: 'all' | 'today' | 'last7' | 'this_month' | 'custom') => {
    setDateFilter(filter);
    setCurrentPage(1);
  };

  const handleCustomStartChange = (value: string) => {
    setCustomStart(value);
    setCurrentPage(1);
  };

  const handleCustomEndChange = (value: string) => {
    setCustomEnd(value);
    setCurrentPage(1);
  };

  if (currentUser.role !== 'owner') {
    return (
      <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-950/50 p-4 text-sm text-red-200">
        Only the admin can view the status log.
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header className="rounded-3xl p-5 glass-panel sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
          <div className="flex min-w-0 items-start gap-4 xl:flex-1">
            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-orange-400">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black text-white">Status Log</h1>
              <p className="mt-1 text-sm text-stone-400">
                Review POS sales and inventory changes by admin or staff, with the record type and ID.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
            <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-orange-500/20 bg-stone-950/70 p-1 text-xs">
              <Filter className="ml-1.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
              {([
                ['all', 'All time'],
                ['today', 'Today'],
                ['last7', 'Last 7d'],
                ['this_month', 'This month'],
                ['custom', 'Custom'],
              ] as const).map(([filter, label]) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => handleDateFilterChange(filter)}
                  aria-pressed={dateFilter === filter}
                  className={`shrink-0 cursor-pointer rounded-lg px-2 py-1 font-medium transition ${
                    dateFilter === filter
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {dateFilter === 'custom' && (
              <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-orange-500/30 bg-stone-950/80 p-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5 text-orange-400" />
                <input
                  type="date"
                  aria-label="Start date"
                  value={customStart}
                  onChange={(event) => handleCustomStartChange(event.target.value)}
                  className="dashboard-custom-date bg-transparent text-xs text-stone-200 focus:outline-none"
                />
                <span className="text-stone-500">to</span>
                <input
                  type="date"
                  aria-label="End date"
                  value={customEnd}
                  onChange={(event) => handleCustomEndChange(event.target.value)}
                  className="dashboard-custom-date bg-transparent text-xs text-stone-200 focus:outline-none"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={isLoading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2.5 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/20 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-950/50 p-4 text-sm text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Could not load the status log: {error}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl glass-panel">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-stone-400">
            <LoaderCircle className="h-5 w-5 animate-spin text-orange-400" />
            Loading status log…
          </div>
        ) : totalEntries === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-stone-600" />
            <h2 className="mt-4 font-bold text-stone-200">
              {dateFilter === 'all' ? 'No activity recorded yet' : 'No activity in this date range'}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {dateFilter === 'all'
                ? 'Changes will appear here after the activity log database setup is complete.'
                : `No activity found for ${
                    dateFilter === 'today'
                      ? 'today'
                      : dateFilter === 'last7'
                        ? 'the last 7 days'
                        : dateFilter === 'this_month'
                          ? 'this month'
                          : 'the selected dates'
                  }.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-orange-500/20 bg-orange-500/10">
                <tr className="text-stone-400 uppercase text-[11px]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Record</th>
                  <th className="py-3 px-4">Date and time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800 font-mono">
                {entries.map((entry) => (
                  <tr key={entry.id} className="text-stone-300 hover:bg-stone-800/40 transition">
                    <td className="py-3.5 px-4">
                      {entry.actor_role && (
                        <span className="mb-1 inline-block rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider text-orange-300">
                          {entry.actor_role}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          entry.action === 'SALE'
                            ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                            : entry.action === 'LOST'
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                            : entry.action === 'INSERT'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : entry.action === 'UPDATE'
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                              : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {formatAction(entry.action)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="block font-sans font-medium text-stone-200">
                        {formatRecord(entry)}
                      </span>
                      {entry.record_id && (
                        <span className="mt-1 block text-[11px] text-stone-500">{entry.record_id}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap py-3.5 px-4">
                      {new Date(entry.occurred_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {totalEntries > 0 && (
        <div className="space-y-2">
          <p className="text-right text-xs text-stone-500">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, totalEntries)} of {totalEntries} activities · newest first
          </p>
          <Pagination
            totalItems={totalEntries}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </section>
  );
};
