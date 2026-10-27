import React, { useMemo, useState } from 'react';
import { ReceiptText } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Order } from '../types';
import { PAGE_SIZE, Pagination } from './Pagination';
import { ReceiptModal } from './ReceiptModal';

export const ReceiptsView: React.FC = () => {
  const { currentUser, orders, isDarkMode } = useStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const receipts = useMemo(
    () =>
      orders
        .filter((order) => order.id.startsWith('pos_') || order.orderNumber.startsWith('POS-'))
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders],
  );

  const visibleReceipts = receipts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  if (currentUser.role !== 'owner') {
    return (
      <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-950/50 p-4 text-sm text-red-200">
        Only the admin can view receipts.
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-4 rounded-3xl p-5 glass-panel sm:p-7">
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-orange-400">
          <ReceiptText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Receipts</h1>
          <p className="mt-1 text-sm text-stone-400">
            POS receipts, ordered from newest to oldest.
          </p>
        </div>
      </header>

      <div className="overflow-hidden rounded-3xl glass-panel">
        <div className="border-b border-stone-800 px-4 py-3 text-xs text-stone-400 sm:px-6">
          {receipts.length} {receipts.length === 1 ? 'receipt' : 'receipts'}
        </div>
        {receipts.length === 0 ? (
          <div className="p-12 text-center">
            <ReceiptText className="mx-auto h-10 w-10 text-stone-600" />
            <h2 className="mt-4 font-bold text-stone-200">No receipts yet</h2>
            <p className="mt-1 text-sm text-stone-500">Completed POS sales will appear here.</p>
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
