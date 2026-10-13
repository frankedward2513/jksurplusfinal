import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Calendar,
  ExternalLink,
  Filter,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Shirt,
  Trophy,
} from 'lucide-react';

type ShowcaseMode = 'browse' | 'top_customers';
type CustomerSpend = {
  customerId: string;
  customerName: string;
  totalSpent: number;
};

export const ShowcaseShopView: React.FC = () => {
  const { products, categories, currentUser, orders } = useStore();
  const isStoreAdmin = currentUser.role === 'owner';
  const [activeMode, setActiveMode] = useState<ShowcaseMode>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [topCustomerFilterType, setTopCustomerFilterType] = useState<'month' | 'custom'>('month');
  const currentMonth = useMemo(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query);
        const matchesCategory =
          selectedCategory === 'all' ||
          product.category?.toLowerCase() === selectedCategory.toLowerCase();
        return matchesSearch && matchesCategory;
      }),
    [products, searchQuery, selectedCategory],
  );

  const availableMonths = useMemo(() => {
    const months = new Set<string>([currentMonth]);
    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      if (!Number.isNaN(date.getTime())) {
        months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [orders, currentMonth]);

  const formatMonthLabel = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return Number.isNaN(date.getTime())
      ? yearMonth
      : date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  };

  const top10Customers = useMemo(() => {
    const customerMap = new Map<string, CustomerSpend>();

    orders.forEach((order) => {
      if (order.status === 'cancelled') return;
      const orderDate = new Date(order.createdAt);
      if (Number.isNaN(orderDate.getTime())) return;

      if (topCustomerFilterType === 'month') {
        const [year, month] = selectedMonth.split('-').map(Number);
        if (orderDate.getFullYear() !== year || orderDate.getMonth() !== month - 1) return;
      } else {
        if (customStartDate) {
          const startDate = new Date(`${customStartDate}T00:00:00`);
          if (orderDate < startDate) return;
        }
        if (customEndDate) {
          const endDate = new Date(`${customEndDate}T23:59:59.999`);
          if (orderDate > endDate) return;
        }
      }

      const email = (order.email || '').trim().toLowerCase();
      const phone = (order.contactNumber || '').replace(/\D/g, '').slice(-10);
      const name = (order.customerName || 'Customer').trim();
      const key = order.userId || email || (phone.length >= 7 ? `phone_${phone}` : name.toLowerCase());
      const customer = customerMap.get(key) || {
        customerId: key,
        customerName: name,
        totalSpent: 0,
      };
      customer.totalSpent += Number(order.totalAmount) || 0;
      if (customer.customerName === 'Customer' && name !== 'Customer') {
        customer.customerName = name;
      }
      customerMap.set(key, customer);
    });

    return Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  }, [orders, topCustomerFilterType, selectedMonth, customStartDate, customEndDate]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-5 rounded-3xl p-5 sm:p-6 glass-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">JKsur+ Shop</h1>
            <p className="mt-1 text-sm font-medium italic text-amber-300">
              Your next outfit is hiding here.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMode('browse')}
              aria-pressed={activeMode === 'browse'}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                activeMode === 'browse'
                  ? 'bg-orange-600 text-white'
                  : 'border border-orange-500/30 bg-stone-900/80 text-stone-200 hover:text-white'
              }`}
            >
              <Shirt className="h-4 w-4" />
              Browse Clothing
            </button>
            {isStoreAdmin && (
              <button
                type="button"
                onClick={() => setActiveMode('top_customers')}
                aria-pressed={activeMode === 'top_customers'}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  activeMode === 'top_customers'
                    ? 'bg-orange-600 text-white'
                    : 'border border-orange-500/30 bg-stone-900/80 text-stone-200 hover:text-white'
                }`}
              >
                <Trophy className="h-4 w-4 text-amber-400" />
                Top 10 Customers
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-orange-500/15 pt-4 text-xs text-stone-300">
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-orange-400" />
            JKsur+ Novaliches, Quezon City, Metro Manila
          </span>
          <a
            href="tel:+639123456789"
            className="inline-flex items-center gap-2 transition hover:text-white"
          >
            <Phone className="h-4 w-4 shrink-0 text-orange-400" />
            +63 912 345 6789
          </a>
          <span className="inline-flex items-center gap-2">
            <MessageCircle className="h-4 w-4 shrink-0 text-blue-400" />
            Messenger: Jhobet Ebora
          </span>
        </div>
      </div>

      {activeMode === 'browse' ? (
        <>
          <section className="p-4 sm:p-5 rounded-2xl glass-panel space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="search"
                aria-label="Search clothing"
                placeholder="Search clothing..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-orange-500/20 bg-stone-950/70 py-3 pl-11 pr-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="flex shrink-0 items-center gap-1 pr-1 font-semibold text-stone-400">
                <Filter className="h-3.5 w-3.5 text-orange-400" />
                Categories:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`shrink-0 rounded-full px-3.5 py-1.5 font-medium transition ${
                  selectedCategory === 'all'
                    ? 'bg-orange-600 text-white'
                    : 'border border-stone-800 bg-stone-900/80 text-stone-400 hover:text-white'
                }`}
              >
                All Items
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.name)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition ${
                    selectedCategory.toLowerCase() === category.name.toLowerCase()
                      ? 'bg-orange-600 text-white'
                      : 'border border-stone-800 bg-stone-900/80 text-stone-400 hover:text-white'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: category.color || '#ea580c' }}
                  />
                  {category.name}
                </button>
              ))}
            </div>
          </section>

          {filteredProducts.length === 0 ? (
            <div className="space-y-2 rounded-3xl p-12 text-center glass-panel">
              <Shirt className="mx-auto h-10 w-10 text-orange-400 opacity-60" />
              <h2 className="text-lg font-bold text-white">No Products Available</h2>
              <p className="mx-auto max-w-md text-xs text-stone-400">
                {products.length === 0
                  ? 'No clothing has been listed yet.'
                  : 'No products match your search and category.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-orange-500/20 glass-panel glass-panel-hover"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-950">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center bg-stone-900 text-stone-600">
                        <Shirt className="mb-2 h-10 w-10 opacity-50" />
                        <span className="text-xs">EXINS Fashion</span>
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-lg border border-orange-500/30 bg-stone-950/80 px-2.5 py-1 text-xs font-bold text-orange-400">
                      Size: {product.size || 'Free Size'}
                    </span>
                    <span
                      className={`absolute right-3 top-3 rounded-lg border px-2.5 py-1 text-xs font-bold ${
                        product.availableQuantity <= 0
                          ? 'border-rose-500/30 bg-rose-950/90 text-rose-300'
                          : product.availableQuantity <= 3
                            ? 'border-amber-500/30 bg-amber-950/90 text-amber-300'
                            : 'border-emerald-500/30 bg-emerald-950/80 text-emerald-400'
                      }`}
                    >
                      {product.availableQuantity <= 0
                        ? 'Sold Out'
                        : `${product.availableQuantity} in stock`}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between space-y-4 p-5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-400">
                          {product.category || 'Apparel'}
                        </span>
                        {product.productLink && (
                          <a
                            href={product.productLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-stone-400 transition hover:text-orange-400"
                          >
                            Visit Link <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <h2 className="line-clamp-1 text-base font-bold leading-snug text-white">
                        {product.name}
                      </h2>
                      <p className="line-clamp-2 text-xs text-stone-400">
                        {product.description || 'Exclusive apparel from JKsur+.'}
                      </p>
                    </div>
                    <div className="border-t border-stone-800/80 pt-3">
                      <p className="text-[10px] uppercase text-stone-400">Price</p>
                      <p className="font-mono text-lg font-black text-orange-400">
                        ₱{product.sellingPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <section className="mx-auto max-w-2xl space-y-6 rounded-3xl p-6 sm:p-8 glass-panel">
          <h2 className="flex items-center gap-2.5 border-b border-orange-500/20 pb-4 text-xl font-black text-white sm:text-2xl">
            <Trophy className="h-5 w-5 text-orange-400" />
            Top 10 Customers
          </h2>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setTopCustomerFilterType('month')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  topCustomerFilterType === 'month'
                    ? 'bg-orange-600 text-white'
                    : 'border border-stone-800 bg-stone-900 text-stone-300'
                }`}
              >
                <Calendar className="h-4 w-4" />
                Select Month and Year
              </button>
              <button
                type="button"
                onClick={() => setTopCustomerFilterType('custom')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  topCustomerFilterType === 'custom'
                    ? 'bg-orange-600 text-white'
                    : 'border border-stone-800 bg-stone-900 text-stone-300'
                }`}
              >
                <Calendar className="h-4 w-4" />
                Custom Date Range
              </button>
            </div>
            {topCustomerFilterType === 'month' ? (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-orange-500/20 bg-stone-950/60 p-3.5 text-xs">
                <label htmlFor="top-customers-month" className="font-medium text-stone-300">
                  Month &amp; Year:
                </label>
                <input
                  type="month"
                  aria-label="Choose month and year"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="cursor-pointer rounded-xl border border-orange-500/30 bg-stone-900 px-3 py-2 text-white"
                />
                <select
                  id="top-customers-month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="cursor-pointer rounded-xl border border-stone-800 bg-stone-900 px-3 py-2 text-stone-200"
                >
                  {availableMonths.map((month) => (
                    <option key={month} value={month}>
                      {formatMonthLabel(month)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-orange-500/20 bg-stone-950/60 p-3.5 text-xs">
                <label className="flex items-center gap-2 text-stone-400">
                  Start Date:
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    className="rounded-xl border border-orange-500/30 bg-stone-900 px-3 py-1.5 text-white"
                  />
                </label>
                <label className="flex items-center gap-2 text-stone-400">
                  End Date:
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    className="rounded-xl border border-orange-500/30 bg-stone-900 px-3 py-1.5 text-white"
                  />
                </label>
                {(customStartDate || customEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="rounded-xl bg-stone-800 px-3 py-1.5 text-stone-300 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            {top10Customers.length === 0 ? (
              <div className="rounded-2xl border border-stone-800 bg-stone-950/40 py-10 text-center text-sm font-semibold text-white">
                No customers found for this period
              </div>
            ) : (
              top10Customers.map((customer, index) => (
                <div
                  key={customer.customerId}
                  className="flex items-center gap-3.5 rounded-2xl border border-orange-500/20 bg-stone-950/70 p-3.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-orange-500/30 bg-stone-900 font-mono text-xs font-bold text-orange-400">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm font-bold text-white sm:text-base">
                    {customer.customerName}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
};
