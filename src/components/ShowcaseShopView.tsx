import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';
import {
  ExternalLink,
  Filter,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Shirt,
  X,
} from 'lucide-react';

function getProductImageUrls(product: Product): string[] {
  const imageUrls = product.imageUrls?.filter((url) => url.trim().length > 0) || [];
  return imageUrls.length > 0 ? imageUrls : product.imageUrl ? [product.imageUrl] : [];
}

export const ShowcaseShopView: React.FC = () => {
  const { products, categories } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [maximumPrice, setMaximumPrice] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (!selectedProduct) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedProduct(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedProduct]);

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
  const selectedProductImages = selectedProduct ? getProductImageUrls(selectedProduct) : [];

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
              {filteredProducts.map((product) => {
                const productImages = getProductImageUrls(product);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setSelectedImageIndex(0);
                      setSelectedProduct(product);
                    }}
                    aria-label={`View details for ${product.name}`}
                    className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-orange-500/20 text-left glass-panel glass-panel-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-950">
                      {productImages[0] ? (
                        <img
                          src={productImages[0]}
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
                      {productImages.length > 1 && (
                        <span className="absolute right-3 top-3 rounded-lg border border-stone-700 bg-stone-950/80 px-2.5 py-1 text-xs font-bold text-stone-200">
                          {productImages.length} photos
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between space-y-4 p-5">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-400">
                            {product.category || 'Apparel'}
                          </span>
                        </div>
                        <h2 className="line-clamp-1 text-base font-bold leading-snug text-white">
                          {product.name}
                        </h2>
                        <p className="line-clamp-2 text-xs text-stone-400">
                          {product.description || 'Exclusive apparel from JKsur+.'}
                        </p>
                      </div>
                      <div className="flex items-end justify-between gap-3 border-t border-stone-800/80 pt-3">
                        <div>
                          <p className="text-[10px] uppercase text-stone-400">Price</p>
                          <p className="font-mono text-lg font-black text-orange-400">
                            ₱{product.sellingPrice.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase text-stone-400">Available</p>
                          <p className="font-mono text-sm font-bold text-stone-200">
                            {product.availableQuantity} pcs
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setSelectedProduct(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`showcase-product-${selectedProduct.id}`}
            onClick={(event) => event.stopPropagation()}
            className="grid h-[90vh] max-h-[850px] w-full max-w-5xl grid-rows-[minmax(180px,35vh)_minmax(0,1fr)] overflow-hidden rounded-3xl border border-orange-500/30 bg-stone-900 text-stone-100 shadow-2xl md:grid-cols-2 md:grid-rows-1"
          >
            <div className="flex min-h-0 flex-col bg-stone-950">
              <div className="relative min-h-0 flex-1">
                {selectedProductImages[selectedImageIndex] ? (
                  <img
                    src={selectedProductImages[selectedImageIndex]}
                    alt={`${selectedProduct.name}, photo ${selectedImageIndex + 1}`}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-stone-600">
                    <Shirt className="mb-2 h-12 w-12 opacity-50" />
                    <span className="text-sm">EXINS Fashion</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  aria-label="Close product details"
                  autoFocus
                  className="absolute right-3 top-3 rounded-xl border border-stone-700 bg-stone-950/85 p-2 text-stone-300 transition hover:bg-stone-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {selectedProductImages.length > 1 && (
                <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-stone-800 p-2">
                  {selectedProductImages.map((imageUrl, index) => (
                    <button
                      key={`${imageUrl}-${index}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      aria-label={`View photo ${index + 1}`}
                      aria-pressed={selectedImageIndex === index}
                      className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border ${
                        selectedImageIndex === index
                          ? 'border-orange-400'
                          : 'border-stone-700 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="min-h-0 space-y-6 overflow-y-auto p-5 sm:p-7">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                  {selectedProduct.category || 'Apparel'}
                </p>
                <h2
                  id={`showcase-product-${selectedProduct.id}`}
                  className="break-words text-2xl font-black leading-tight text-white sm:text-3xl"
                >
                  {selectedProduct.name}
                </h2>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-300">
                  {selectedProduct.description || 'Exclusive apparel from JKsur+.'}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-3">
                <div className="space-y-1 rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                  <dt className="text-xs text-stone-400">Size</dt>
                  <dd className="break-words font-semibold text-stone-100">
                    {selectedProduct.size || 'Free Size'}
                  </dd>
                </div>
                <div className="space-y-1 rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                  <dt className="text-xs text-stone-400">Available quantity</dt>
                  <dd className="font-mono font-semibold text-stone-100">
                    {selectedProduct.availableQuantity.toLocaleString()} pcs
                  </dd>
                </div>
              </dl>

              <div className="rounded-2xl border border-orange-500/20 bg-orange-950/20 p-4">
                <p className="text-xs uppercase tracking-wide text-stone-400">Price</p>
                <p className="mt-1 font-mono text-2xl font-black text-orange-400">
                  ₱{selectedProduct.sellingPrice.toLocaleString()}
                </p>
              </div>

              {selectedProduct.productLink && (
                <a
                  href={selectedProduct.productLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-2 break-all text-sm font-semibold text-orange-400 transition hover:text-orange-300"
                >
                  Visit product link <ExternalLink className="h-4 w-4 shrink-0" />
                </a>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
