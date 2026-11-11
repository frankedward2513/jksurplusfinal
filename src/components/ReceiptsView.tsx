import React, { useMemo, useState } from 'react';
import { Calendar, Filter, ReceiptText } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Order } from '../types';
import { addMissingPosInflows, isDateWithinFilter } from '../utils/financialInflow';
import { PAGE_SIZE, Pagination } from './Pagination';
import { ReceiptModal } from './ReceiptModal';

type ReceiptDateFilter = 'all' | 'today' | 'last7' | 'this_month' | 'custom';

export const ReceiptsView: React.FC = () => {
  const { currentUser, orders, transactions, isDarkMode } = useStore();
  const [dateFilter, setDateFilter] = useState<ReceiptDateFilter>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const receipts = useMemo(() => {
    return orders
      .filter((order) => {
        if (!order.id.startsWith('pos_') && !order.orderNumber.startsWith('POS-')) return false;
        return isDateWithinFilter(order.createdAt, dateFilter, customStart, customEnd);
      })
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, dateFilter, customStart, customEnd]);
  const inflowTransactions = useMemo(
    () =>
      addMissingPosInflows(transactions, orders).filter(
        (transaction) =>
          transaction.flowType === 'inflow' &&
          isDateWithinFilter(transaction.date || transaction.createdAt, dateFilter, customStart, customEnd),
      ),
    [transactions, orders, dateFilter, customStart, customEnd],
  );

  const handleDateFilterChange = (filter: ReceiptDateFilter) => {
    setDateFilter(filter);
    setCurrentPage(1);
  };

  const visibleReceipts = receipts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const paymentTotals = useMemo(
    () =>
      inflowTransactions.reduce(
        (totals, order) => {
          if (order.paymentMethod === 'cash' || order.paymentMethod === 'gcash') {
            totals[order.paymentMethod] += Number(order.inflow) || 0;
          }
          return totals;
        },
        { cash: 0, gcash: 0 },
      ),
    [inflowTransactions],
  );
  const totalInflow = useMemo(
    () => inflowTransactions.reduce((total, transaction) => total + (Number(transaction.inflow) || 0), 0),
    [inflowTransactions],
  );

  if (currentUser.role !== 'owner' && currentUser.role !== 'staff') {
    return (
      <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-950/50 p-4 text-sm text-red-200">
        Only staff and the admin can view receipts.
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center gap-4 rounded-3xl p-5 glass-panel sm:p-7">
        <div className="flex shrink-0 items-center gap-4">
          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-orange-400">
            <ReceiptText className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-white">Receipts</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              Cash total
            </span>
            <span className="text-sm font-bold text-white">₱{paymentTotals.cash.toLocaleString()}</span>
          </div>
          <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-sky-300">
              GCash total
            </span>
            <span className="text-sm font-bold text-white">₱{paymentTotals.gcash.toLocaleString()}</span>
          </div>
          <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 px-3 py-2">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-orange-300">
              Total inflow
            </span>
            <span className="text-sm font-bold text-white">₱{totalInflow.toLocaleString()}</span>
          </div>
        </div>
        <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
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
                  onChange={(event) => {
                    setCustomStart(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="dashboard-custom-date bg-transparent text-xs text-stone-200 focus:outline-none"
                />
                <span className="text-stone-500">to</span>
                <input
                  type="date"
                  aria-label="End date"
                  value={customEnd}
                  onChange={(event) => {
                    setCustomEnd(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="dashboard-custom-date bg-transparent text-xs text-stone-200 focus:outline-none"
                />
              </div>
            )}
        </div>
      </header>

      <div className="overflow-hidden rounded-3xl glass-panel">
        <div className="border-b border-stone-800 px-4 py-3 text-xs text-stone-400 sm:px-6">
          {receipts.length} {receipts.length === 1 ? 'receipt' : 'receipts'}
        </div>
        {receipts.length === 0 ? (
          <div className="p-12 text-center">
            <ReceiptText className="mx-auto h-10 w-10 text-stone-600" />
            <h2 className="mt-4 font-bold text-stone-200">
              {dateFilter === 'all' ? 'No receipts yet' : 'No receipts in this date range'}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {dateFilter === 'all'
                ? 'Completed POS sales will appear here.'
                : `No completed POS sales found for ${
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
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="border-b border-orange-500/20 bg-orange-500/10">
                  <tr className="text-[11px] uppercase text-stone-400">
                    <th className="px-4 py-3">Receipt</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3 text-center">Items</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Date and time</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800 font-mono">
                  {visibleReceipts.map((order) => (
                    <tr key={order.id} className="text-stone-300 transition hover:bg-stone-800/40">
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-orange-300">
                        {order.orderNumber}
                      </td>
                      <td className="px-4 py-3 font-sans text-stone-200">
                        {order.customerName || 'Walk-in Customer'}
                      </td>
                      <td className="px-4 py-3 text-center">{order.items.length}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-white">
                        ₱{order.totalAmount.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 capitalize">
                        {(order.paymentMethod || 'N/A').replaceAll('_', ' ')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className={`rounded-lg px-3 py-1.5 font-sans font-semibold transition ${
                            isDarkMode
                              ? 'border border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 hover:text-white'
                              : 'border border-orange-400/40 bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md shadow-orange-600/20 hover:from-orange-500 hover:to-amber-600'
                          }`}
                        >
                          View receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 sm:px-6">
              <Pagination
                totalItems={receipts.length}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>
      <ReceiptModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </section>
  );
};
