import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  ExternalLink,
  Filter,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Shirt,
} from 'lucide-react';

export const ShowcaseShopView: React.FC = () => {
  const { products, categories } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [maximumPrice, setMaximumPrice] = useState('');

  const availableProducts = useMemo(
    () => products.filter((product) => product.availableQuantity > 0),
    [products],
  );
  const visibleCategories = useMemo(
    () =>
      categories.filter((category) =>
        availableProducts.some(
          (product) => product.category?.toLowerCase() === category.name.toLowerCase(),
        ),
      ),
    [availableProducts, categories],
  );
  const filteredProducts = useMemo(
    () =>
      availableProducts.filter((product) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query);
        const matchesCategory =
          selectedCategory === 'all' ||
          product.category?.toLowerCase() === selectedCategory.toLowerCase();
        const maxPrice = maximumPrice === '' ? null : Number(maximumPrice);
        const matchesMaximumPrice =
          maxPrice === null || (Number.isFinite(maxPrice) && product.sellingPrice <= maxPrice);
        return matchesSearch && matchesCategory && matchesMaximumPrice;
      }),
    [availableProducts, searchQuery, selectedCategory, maximumPrice],
  );
  const hasAvailableProducts = availableProducts.length > 0;

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

      <section className="p-4 sm:p-5 rounded-2xl glass-panel space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[3fr_1fr]">
              <div className="flex min-w-0 flex-col gap-2">
                <label htmlFor="showcase-search" className="text-xs font-semibold text-stone-300">
                  Search clothing
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    id="showcase-search"
                    type="search"
                    placeholder="Search clothing..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full rounded-xl border border-orange-500/20 bg-stone-950/70 py-3 pl-11 pr-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <label htmlFor="showcase-maximum-price" className="text-xs font-semibold text-stone-300">
                  Budget amount (₱)
                </label>
                <input
                  id="showcase-maximum-price"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="e.g. 500"
                  value={maximumPrice}
                  onChange={(event) => setMaximumPrice(event.target.value)}
                  className="w-full rounded-xl border border-orange-500/20 bg-stone-950/70 px-4 py-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
                />
              </div>
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
              {visibleCategories.map((category) => (
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
                {!hasAvailableProducts
                  ? 'No clothing is currently available.'
                  : 'No products match your search, category, and maximum price.'}
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
    </div>
  );
};
