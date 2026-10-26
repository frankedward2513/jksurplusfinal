import React, { useEffect, useState } from 'react';
import { AlertCircle, ArchiveRestore, Clock3, LoaderCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { TrashItem } from '../types';

function getRecordName(item: TrashItem): string {
  const data = item.recordData;
  const possibleNames = ['name', 'baleName', 'orderNumber', 'productName', 'accountName', 'description'];
  const name = possibleNames
    .map((key) => data[key])
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return name || `${item.tableName.replaceAll('_', ' ')} ${item.recordId}`;
}

function getCountdown(expiresAt: string, now: number): string {
  const remainingSeconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export const TrashBinView: React.FC = () => {
  const { fetchTrashItems, restoreTrashItems } = useStore();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await fetchTrashItems());
      setSelectedIds(new Set());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load exBIN.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const toggleItem = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((previous) =>
      previous.size === items.length ? new Set() : new Set(items.map((item) => item.id)),
    );
  };

  const restoreSelected = async (ids: string[]) => {
    if (!ids.length) return;
    setIsRestoring(true);
    setError(null);
    try {
      await restoreTrashItems(ids);
      await refresh();
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Could not restore selected items.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl p-5 glass-panel sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-orange-400">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">exBIN</h1>
            <p className="mt-1 text-sm text-stone-400">
              Deleted records stay here for 30 days, then move to the archive. Restore items individually or select several.
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
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl glass-panel">
        <div className="flex flex-col gap-3 border-b border-stone-800 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <label className="flex items-center gap-3 text-sm font-semibold text-stone-200">
            <input
              type="checkbox"
              checked={items.length > 0 && selectedIds.size === items.length}
              onChange={toggleAll}
              disabled={items.length === 0 || isLoading || isRestoring}
              className="h-4 w-4 accent-orange-500"
            />
            Select all ({items.length})
          </label>
          <button
            type="button"
            onClick={() => void restoreSelected([...selectedIds])}
            disabled={selectedIds.size === 0 || isRestoring || isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-900/30 transition hover:from-orange-500 hover:to-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRestoring ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
            Restore selected{selectedIds.size ? ` (${selectedIds.size})` : ''}
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-stone-400">
            <LoaderCircle className="h-5 w-5 animate-spin text-orange-400" />
            Loading exBIN…
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Trash2 className="mx-auto h-10 w-10 text-stone-600" />
            <h2 className="mt-4 font-bold text-stone-200">exBIN is empty</h2>
            <p className="mt-1 text-sm text-stone-500">Deleted records will appear here for 30 days before moving to the archive.</p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-800/80">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-6">
                <label className="flex min-w-0 flex-1 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                    disabled={isRestoring}
                    aria-label={`Select ${getRecordName(item)} to restore`}
                    className="mt-1 h-4 w-4 shrink-0 accent-orange-500"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-white">{getRecordName(item)}</span>
                    <span className="mt-1 block text-xs capitalize text-stone-400">
                      {item.tableName.replaceAll('_', ' ')} · Deleted {new Date(item.deletedAt).toLocaleString()}
                    </span>
                  </span>
                </label>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 font-mono text-xs text-amber-300">
                    <Clock3 className="h-3.5 w-3.5" />
                    {getCountdown(item.expiresAt, now)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void restoreSelected([item.id])}
                    disabled={isRestoring}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/30 px-3 py-2 text-xs font-bold text-orange-300 transition hover:bg-orange-500/10 disabled:opacity-50"
                    aria-label={`Restore ${getRecordName(item)}`}
                  >
                    <ArchiveRestore className="h-4 w-4" />
                    Restore
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-center text-xs text-stone-500">
        Items move to the archive after 30 days. Only the owner account can access exBIN.
      </p>
    </section>
  );
};
