import type { Order, Transaction } from '../types';

export type FinancialDateFilter = 'all' | 'today' | 'last7' | 'this_month' | 'custom';

export function getLocalDateKey(value: string | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isDateWithinFilter(
  value: string | undefined,
  filter: FinancialDateFilter,
  customStart: string,
  customEnd: string,
): boolean {
  if (filter === 'all') return true;
  const dateKey = getLocalDateKey(value);
  if (!dateKey) return false;

  const now = new Date();
  const todayKey = getLocalDateKey(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  );
  if (filter === 'today') return dateKey === todayKey;
  if (filter === 'last7') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const startKey = getLocalDateKey(
      `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
    );
    return !!startKey && !!todayKey && dateKey >= startKey && dateKey <= todayKey;
  }
  if (filter === 'this_month') return dateKey.startsWith(todayKey?.slice(0, 7) || '');
  if (customStart && dateKey < customStart) return false;
  if (customEnd && dateKey > customEnd) return false;
  return true;
}

export function addMissingPosInflows(transactions: Transaction[], orders: Order[]): Transaction[] {
  const inflowTransactions = transactions.filter((transaction) => transaction.flowType === 'inflow');
  const transactionsByOrderId = new Set<string>();

  inflowTransactions.forEach((transaction) => {
    if (transaction.orderId) {
      transactionsByOrderId.add(transaction.orderId);
      return;
    }

    const linkedOrder = orders.find((order) =>
      transaction.description?.includes(order.orderNumber),
    );
    if (linkedOrder) transactionsByOrderId.add(linkedOrder.id);
  });

  const missingPosInflows = orders
    .filter((order) =>
      order.status !== 'cancelled' &&
      (order.id.startsWith('pos_') || order.orderNumber.startsWith('POS-')) &&
      !transactionsByOrderId.has(order.id),
    )
    .map((order): Transaction => ({
      id: `order_fallback_${order.id}`,
      date: getLocalDateKey(order.createdAt) || '',
      flowType: 'inflow',
      category: 'POS Sales',
      account: 'Store Counter Sales',
      description: `POS counter sale #${order.orderNumber} (${order.customerName || 'Walk-in'})`,
      paymentMethod: order.paymentMethod || 'cash',
      inflow: Number(order.totalAmount) || 0,
      outflow: 0,
      orderId: order.id,
      createdAt: order.createdAt,
    }));

  return [...transactions, ...missingPosInflows];
}
