import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../context/StoreContext';
import {
  LayoutDashboard,
  Boxes,
  DollarSign,
  TrendingUp,
  Sparkles,
  Shirt,
  Store,
  Sun,
  Moon,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  UserCheck,
  LogIn,
  Trash2,
  ClipboardList,
  ChevronDown,
  ReceiptText,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'inventory'
  | 'finance'
  | 'forecasting'
  | 'ai_chat'
  | 'showcase'
  | 'pos'
  | 'exbin'
  | 'status_log'
  | 'receipts';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAuth,
}) => {
  const { isDarkMode, toggleDarkMode, currentUser, logout, showFormAlert } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [othersOpen, setOthersOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sign-out error.';
      console.error('Sign out failed:', error);
      showFormAlert(`Sign out failed: ${message}`, 'error');
    }
  };

  // Define navigation items without numbers and with Hi Im your AI Exins
  const getNavItems = () => {
    if (currentUser.role === 'owner') {
      return [
        { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'inventory' as ActiveTab, label: 'Inventory Management', icon: Boxes },
        { id: 'finance' as ActiveTab, label: 'Finance Management', icon: DollarSign },
        { id: 'forecasting' as ActiveTab, label: 'Sales Forecast', icon: TrendingUp },
        { id: 'ai_chat' as ActiveTab, label: 'Hi Im your AI Exins', icon: Sparkles },
      ];
    } else if (currentUser.role === 'staff') {
      return [
        { id: 'pos' as ActiveTab, label: 'POS', icon: Store },
        { id: 'inventory' as ActiveTab, label: 'Inventory Management', icon: Boxes },
        { id: 'showcase' as ActiveTab, label: 'Showcase Shop', icon: Shirt },
      ];
    } else {
      return [{ id: 'showcase' as ActiveTab, label: 'Showcase Shop', icon: Shirt }];
    }
  };

  const navItems = getNavItems();
  const otherNavItems =
    currentUser.role === 'owner'
      ? [
          { id: 'exbin' as ActiveTab, label: 'exBIN', icon: Trash2 },
          { id: 'status_log' as ActiveTab, label: 'Status Log', icon: ClipboardList },
          { id: 'receipts' as ActiveTab, label: 'Receipts', icon: ReceiptText },
          { id: 'showcase' as ActiveTab, label: 'Showcase Shop', icon: Shirt },
          { id: 'pos' as ActiveTab, label: 'POS', icon: Store },
        ]
      : [];

  const selectTab = (tab: ActiveTab) => {
    onSelectTab(tab);
  };

  return (
    <nav className="sticky top-0 z-40 w-full backdrop-blur-xl bg-stone-950/75 border-b border-orange-500/20 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          {/* Logo & Store Branding: Only "JKsur+" and the tagline */}
          <div
            className="flex flex-col cursor-pointer select-none shrink-0"
            onClick={() => onSelectTab(navItems[0].id)}
          >
            <span className="font-black text-xl sm:text-2xl tracking-wider text-orange-500 font-sans leading-tight">
              JKsur+
            </span>
            <p className="hidden sm:block text-[10px] sm:text-xs text-stone-300 italic font-medium leading-none truncate max-w-[200px] sm:max-w-none">
              “Your Next Favorite Outfit is Hiding Here.”
            </p>
          </div>

          {/* Desktop Navigation Items: Icons only with sleek hover tooltip */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div key={item.id} className="relative group flex items-center justify-center">
                  <button
                    onClick={() => onSelectTab(item.id)}
                    className={`p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-lg shadow-orange-600/30 border border-orange-400/40 scale-105'
                        : 'text-stone-300 hover:text-white hover:bg-stone-800/80 border border-transparent hover:border-orange-500/20'
                    }`}
                    aria-label={item.label}
                  >
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-orange-400 group-hover:text-orange-300'
                      }`}
                    />
                  </button>

                  {/* Hover Tooltip revealing the name of the bar */}
                  <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-stone-900/95 border border-orange-500/30 text-stone-100 text-xs font-semibold whitespace-nowrap shadow-2xl backdrop-blur-xl pointer-events-none opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-150 z-50">
                    <span>{item.label}</span>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-stone-900 rotate-45 border-l border-t border-orange-500/30" />
                  </div>
                </div>
              );
            })}
            {otherNavItems.length > 0 && (
              <>
                <span aria-hidden="true" className="mx-1 text-stone-500">|</span>
                {otherNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <div key={item.id} className="relative group flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => selectTab(item.id)}
                        aria-label={item.label}
                        className={`rounded-2xl border p-2.5 transition ${
                          isActive
                            ? 'border-orange-400/40 bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-lg shadow-orange-600/30'
                            : 'border-transparent text-stone-300 hover:border-orange-500/20 hover:bg-stone-800/80 hover:text-white'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-orange-400'}`} />
                      </button>
                      <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2.5 -translate-x-1/2 scale-95 whitespace-nowrap rounded-xl border border-orange-500/30 bg-stone-900/95 px-3 py-1.5 text-xs font-semibold text-stone-100 opacity-0 shadow-2xl backdrop-blur-xl transition-all duration-150 group-hover:scale-100 group-hover:opacity-100">
                        <span>{item.label}</span>
                        <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-orange-500/30 bg-stone-900" />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Right Action Icons: Dark Mode, Profile */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Dark / Light Toggle */}
            <button
              onClick={toggleDarkMode}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 sm:p-2.5 rounded-xl bg-stone-900/80 border border-orange-500/20 hover:border-orange-500/50 text-stone-200 hover:text-amber-400 transition cursor-pointer shrink-0"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
              )}
            </button>

            {/* Staff and owner sign-in remains available; customers can browse without an account. */}
            <div className="flex items-center gap-1 sm:gap-2">
              {currentUser.role === 'guest' || currentUser.isGuest || !currentUser.email ? (
                <>
                  <div className="hidden sm:flex items-center gap-1.5">
                    <button
                      onClick={onOpenAuth}
                      className="py-1.5 px-3 rounded-xl border border-orange-500/30 hover:border-orange-500 bg-stone-900/80 hover:bg-stone-800 text-stone-200 hover:text-white font-semibold text-xs transition cursor-pointer whitespace-nowrap"
                    >
                      <span>Staff / Owner Sign In</span>
                    </button>
                  </div>

                  {/* Mobile sign-in access for store staff and owners */}
                  <div className="relative sm:hidden">
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      title="Staff / Owner Sign In"
                      aria-label="Staff / Owner Sign In"
                      className="p-2 rounded-xl border border-orange-500/40 bg-stone-900/90 text-orange-400 transition hover:border-orange-400 hover:text-white"
                    >
                      <LogIn className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => (currentUser.role === 'customer' ? onSelectTab('showcase') : onOpenAuth())}
                    className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-stone-900/80 border border-orange-500/20 hover:border-orange-500/50 transition cursor-pointer"
                  >
                    <div className="p-1 rounded-lg bg-orange-500/20 text-orange-400">
                      {currentUser.role === 'owner' ? (
                        <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
                      ) : currentUser.role === 'staff' ? (
                        <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                      ) : (
                        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-300" />
                      )}
                    </div>
                    <div className="hidden md:block text-left text-xs">
                      <p className="font-semibold text-stone-200 leading-tight truncate max-w-[110px]">
                        {currentUser.displayName}
                      </p>
                      <p className="text-[10px] text-orange-400 uppercase font-mono font-medium">
                        {currentUser.role === 'owner' ? 'admin' : currentUser.role}
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => void handleLogout()}
                    title="Sign Out"
                    className="hidden sm:flex p-2.5 rounded-xl bg-stone-900/80 border border-orange-500/20 hover:border-red-500/40 text-stone-400 hover:text-red-400 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 sm:p-2.5 rounded-xl bg-stone-900/80 border border-orange-500/20 text-stone-200 hover:text-white"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Pop-up Modal Overlay rendered to document.body to avoid sticky nav backdrop-blur containing block */}
      {mobileMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] lg:hidden flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="relative w-full max-w-sm max-h-[82vh] overflow-y-auto bg-stone-900/98 border border-orange-500/30 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl flex flex-col space-y-4 my-auto select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pop-up Header */}
              <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
                <div>
                  <span className="font-black text-lg tracking-wider text-orange-500 font-sans">
                    JKsur+ Menu
                  </span>
                  <p className="text-[10px] text-stone-400 italic">Select destination</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {currentUser.role === 'guest' || currentUser.isGuest || !currentUser.email ? (
                <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-orange-500/30 space-y-2.5">
                  <div>
                    <p className="text-xs font-bold text-white">Welcome to JKsur+ Novaliches QC</p>
                    <p className="text-[11px] text-stone-400">
                      Browse clothing and product details without signing in.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-stone-950/80 border border-orange-500/20 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-[10px] text-stone-400">Logged in as</p>
                    <p className="text-xs font-semibold text-white truncate">{currentUser.displayName}</p>
                    <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 inline-block mt-0.5">
                      {currentUser.role === 'owner' ? 'admin' : currentUser.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        onOpenAuth();
                        setMobileMenuOpen(false);
                      }}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-white transition cursor-pointer"
                    >
                      Account
                    </button>
                    <button
                      onClick={() => {
                        void handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="p-1 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 hover:text-white transition"
                      title="Sign Out"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Nav list */}
              <div className="space-y-1.5 pt-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
                          : 'text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-orange-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                {otherNavItems.length > 0 && (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setOthersOpen((open) => !open)}
                      aria-expanded={othersOpen}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                        othersOpen || otherNavItems.some((item) => item.id === activeTab)
                          ? 'bg-orange-500/15 text-orange-200'
                          : 'text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      <span>Others</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${othersOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {othersOpen &&
                      otherNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              selectTab(item.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`ml-3 flex w-[calc(100%-0.75rem)] items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                              isActive
                                ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
                                : 'text-stone-300 hover:bg-stone-800'
                            }`}
                          >
                            <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-orange-400'}`} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </nav>
  );
};
