import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ClipboardList, LoaderCircle, RefreshCw } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { supabase } from '../lib/supabase';
import { PAGE_SIZE, Pagination } from './Pagination';

interface ActivityLogEntry {
  id: number;
  table_name: string;
  record_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  actor_name: string;
  actor_email: string | null;
  occurred_at: string;
}

function getActorRole(email: string | null): 'admin' | 'staff' | null {
  switch (email?.trim().toLowerCase()) {
    case 'exinadmin@gmail.com':
      return 'admin';
    case 'exinstaff@gmail.com':
      return 'staff';
    default:
      return null;
  }
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
  if (action === 'INSERT') return 'Added';
  if (action === 'UPDATE') return 'Edited';
  return 'Deleted';
}

export const ActivityLogView: React.FC = () => {
  const { currentUser } = useStore();
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, count, error: queryError } = await supabase
        .from('audit_logs')
        .select('id, table_name, record_id, action, actor_name, actor_email, occurred_at', {
          count: 'exact',
        })
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
  }, [currentPage]);

  useEffect(() => {
    if (currentUser.role === 'owner') void refresh();
  }, [currentUser.role, refresh]);

  if (currentUser.role !== 'owner') {
    return (
      <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-950/50 p-4 text-sm text-red-200">
        Only the admin can view the status log.
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl p-5 glass-panel sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-orange-400">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Status Log</h1>
            <p className="mt-1 text-sm text-stone-400">
              View who added, edited, or deleted records and when those changes happened.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2.5 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/20 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
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
            <h2 className="mt-4 font-bold text-stone-200">No activity recorded yet</h2>
            <p className="mt-1 text-sm text-stone-500">
              Changes will appear here after the activity log database setup is complete.
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
                      {entry.actor_name.trim().toLowerCase() !== entry.actor_email?.trim().toLowerCase() && (
                        <span className="block font-semibold text-white">{entry.actor_name}</span>
                      )}
                      {getActorRole(entry.actor_email) && (
                        <span className="mb-1 inline-block rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider text-orange-300">
                          {getActorRole(entry.actor_email)}
                        </span>
                      )}
                      {entry.actor_email && (
                        <span className="mt-1 block text-[11px] text-stone-500">{entry.actor_email}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          entry.action === 'INSERT'
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
                      <span className="block font-sans font-medium capitalize text-stone-200">
                        {entry.table_name.replaceAll('_', ' ')}
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
