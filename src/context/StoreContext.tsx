import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  db,
  handleFirestoreError,
  OperationType,
  cleanFirestoreData,
  signInWithPopup,
  googleProvider,
  auth,
  supabase,
} from '../lib/supabase';
import {
  UserProfile,
  UserRole,
  Bale,
  Category,
  Product,
  Supplier,
  ExpenseAccount,
  Expense,
  Order,
  OrderItem,
  CustomerSummary,
  Transaction,
  ItemStatusLog,
  TrashItem,
} from '../types';

export interface SignUpParams {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  address?: string;
  provider?: 'email' | 'google';
  uid?: string;
}

export interface GoogleFastResult {
  needsDetails: boolean;
  userProfile?: UserProfile;
  googleUser?: {
    uid: string;
    email: string;
    displayName: string;
  };
}

interface StoreContextType {
  // Theme & Auth
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  currentUser: UserProfile;
  customers: CustomerSummary[];
  loginAs: (email: string, password?: string) => Promise<boolean>;
  resendSignupConfirmation: (email: string) => Promise<void>;
  signupAs: (
    nameOrParams: string | SignUpParams,
    email?: string,
    password?: string,
    phone?: string,
    address?: string
  ) => Promise<'signed-in' | 'confirmation-required'>;
  loginWithGoogleFast: () => Promise<GoogleFastResult>;
  completeGoogleSignUp: (params: {
    uid: string;
    displayName: string;
    email: string;
    phone: string;
    address: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  
  // Data
  bales: Bale[];
  categories: Category[];
  products: Product[];
  suppliers: Supplier[];
  expenseAccounts: ExpenseAccount[];
  expenses: Expense[];
  orders: Order[];
  transactions: Transaction[];
  itemStatusLogs: ItemStatusLog[];

  formAlert: string | null;
  showFormAlert: (message?: string) => void;
  clearFormAlert: () => void;

  // Bale Management
  addBale: (bale: Omit<Bale, 'id' | 'totalSalesMade' | 'createdAt'>) => Promise<void>;
  updateBale: (id: string, updates: Partial<Bale>) => Promise<void>;
  deleteBale: (id: string) => Promise<void>;

  // Category Management
  addCategory: (cat: Omit<Category, 'id' | 'totalInStock' | 'createdAt'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Product Management
  addProduct: (prod: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Supplier Management
  addSupplier: (supp: Omit<Supplier, 'id' | 'totalBalesSourced' | 'createdAt'>) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  // Expense Account Management
  addExpenseAccount: (acc: Omit<ExpenseAccount, 'id' | 'totalSpent' | 'createdAt'>) => Promise<void>;
  updateExpenseAccount: (id: string, updates: Partial<ExpenseAccount>) => Promise<void>;
  deleteExpenseAccount: (id: string) => Promise<void>;

  // Expense Management
  addExpense: (exp: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Transactions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // POS
  completePosSale: (params: {
    items: { product: Product; quantity: number }[];
    date: string;
    customerName?: string;
    discount: number;
    paymentMethod: 'cash' | 'gcash';
    amountTendered: number;
  }) => Promise<Order>;

  // Inventory Status Logs (Sold, Returned, Damaged, Lost)
  logItemStatus: (params: {
    productId: string;
    productName: string;
    type: 'sold' | 'returned' | 'damaged' | 'lost';
    quantity: number;
    notes?: string;
    adjustStock?: boolean;
  }) => Promise<void>;
  updateItemStatusLog: (
    id: string,
    updates: Partial<ItemStatusLog>,
    options?: {
      restoreStock?: boolean;
      productId?: string;
      quantityToRestore?: number;
    }
  ) => Promise<void>;
  deleteItemStatusLog: (id: string) => Promise<void>;

  // exBIN
  fetchTrashItems: () => Promise<TrashItem[]>;
  restoreTrashItems: (ids: string[]) => Promise<void>;
}

function normalizeOrder(order: Order): Order {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName || 'Walk-in Customer',
    items: Array.isArray(order.items) ? order.items : [],
    totalAmount: Number(order.totalAmount) || 0,
    status: order.status || 'completed',
    discount: Number(order.discount) || 0,
    amountTendered: order.amountTendered,
    changeAmount: order.changeAmount,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt || new Date().toISOString(),
    updatedAt: order.updatedAt,
  };
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function determineRole(email: string, assignedRole?: unknown, provider?: string): UserRole {
  const normalized = email.trim().toLowerCase();
  if (provider === 'email' && normalized === 'exinadmin@gmail.com' && assignedRole === 'admin') {
    return 'owner';
  }
  if (provider === 'email' && normalized === 'exinstaff@gmail.com' && assignedRole === 'staff') {
    return 'staff';
  }
  return 'customer';
}

function isPrivilegedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized === 'exinadmin@gmail.com' || normalized === 'exinstaff@gmail.com';
}

function generateProductBarcode(products: Product[]): string {
  const existingBarcodes = new Set(
    products.map((product) => product.barcode.trim().toLowerCase()).filter(Boolean),
  );
  let barcode = '';

  do {
    barcode = `EX-${Math.floor(100000 + Math.random() * 900000)}`;
  } while (existingBarcodes.has(barcode.toLowerCase()));

  return barcode;
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('exins_theme');
    return saved ? saved === 'dark' : true;
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('exins_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  // Auth state - default to Guest so visitors can browse anonymously.
  const GUEST_USER: UserProfile = {
    uid: 'guest-visitor',
    email: '',
    displayName: 'Guest Visitor',
    role: 'guest',
    isGuest: true,
  };

  const [currentUser, setCurrentUser] = useState<UserProfile>(GUEST_USER);

  const setAuthenticatedUser = (user: User) => {
    const email = (user.email || '').trim().toLowerCase();
    if (!email) {
      setCurrentUser(GUEST_USER);
      localStorage.removeItem('exins_user');
      return;
    }

    const metadata = user.user_metadata || {};
    const profile: UserProfile = {
      uid: user.id,
      email,
      displayName: metadata.full_name || metadata.name || email.split('@')[0],
      role: determineRole(email, user.app_metadata?.exins_role, user.app_metadata?.provider),
      phone: metadata.phone || '',
      address: metadata.address || '',
      provider: user.app_metadata?.provider === 'google' ? 'google' : 'email',
      isGuest: false,
    };
    setCurrentUser(profile);
    localStorage.setItem('exins_user', JSON.stringify(profile));
  };

  useEffect(() => {
    const { data: authListener } = auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthenticatedUser(session.user);
      } else {
        setCurrentUser(GUEST_USER);
        localStorage.removeItem('exins_user');
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const loginAs = async (email: string, password?: string): Promise<boolean> => {
    const normalized = email.trim().toLowerCase();
    if (!password) throw new Error('Please enter your password.');

    const { data, error } = await auth.signInWithPassword({ email: normalized, password });
    if (error) throw error;
    if (!data.user) throw new Error('Sign-in did not return a user account.');
    setAuthenticatedUser(data.user);
    return true;
  };

  const resendSignupConfirmation = async (email: string): Promise<void> => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) throw new Error('Please enter your email address.');

    const { error } = await auth.resend({ type: 'signup', email: normalized });
    if (error) throw error;
  };

  const signupAs = async (
    nameOrParams: string | SignUpParams,
    emailArg?: string,
    _passwordArg?: string,
    phoneArg?: string,
    addressArg?: string
  ): Promise<'signed-in' | 'confirmation-required'> => {
    let name = '';
    let email = '';
    let phone = '';
    let address = '';
    let provider: 'email' | 'google' = 'email';
    let uid = '';
    let password = '';

    if (typeof nameOrParams === 'object') {
      name = nameOrParams.name;
      email = nameOrParams.email;
      password = nameOrParams.password || '';
      phone = nameOrParams.phone || '';
      address = nameOrParams.address || '';
      provider = nameOrParams.provider || 'email';
      uid = nameOrParams.uid || '';
    } else {
      name = nameOrParams;
      email = emailArg || '';
      password = _passwordArg || '';
      phone = phoneArg || '';
      address = addressArg || '';
    }

    const normalized = email.trim().toLowerCase();

    if (isPrivilegedEmail(normalized)) {
      throw new Error('This email is reserved for an admin or staff account. Please sign in instead.');
    }

    let authUser;
    let requiresEmailConfirmation = false;
    if (provider === 'email') {
      if (!password) throw new Error('Please enter a password.');
      const { data, error } = await auth.signUp({
        email: normalized,
        password,
        options: {
          data: {
            full_name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
          },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Sign-up did not return a user account.');
      authUser = data.user;
      requiresEmailConfirmation = !data.session;
    } else {
      const { data, error } = await auth.getUser();
      if (error) throw error;
      if (!data.user || data.user.id !== uid || data.user.email?.toLowerCase() !== normalized) {
        throw new Error('Google sign-in session is no longer valid. Please try again.');
      }
      const { data: updatedUser, error: updateError } = await auth.updateUser({
        data: {
          full_name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
        },
      });
      if (updateError) throw updateError;
      if (!updatedUser.user) throw new Error('Could not save your Google profile details.');
      authUser = updatedUser.user;
    }

    const customerUser: UserProfile = {
      uid: authUser.id,
      email: normalized,
      displayName: name.trim() || (normalized.includes('@') ? normalized.split('@')[0] : 'Customer'),
      phone: phone.trim(),
      address: address.trim(),
      role: 'customer',
      provider,
      isGuest: false,
      createdAt: new Date().toISOString(),
    };

    if (!requiresEmailConfirmation) {
      setCurrentUser(customerUser);
      localStorage.setItem('exins_user', JSON.stringify(customerUser));

      try {
        await setDoc(doc(db, 'users', customerUser.uid), { ...cleanFirestoreData(customerUser), id: customerUser.uid });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${customerUser.uid}`);
      }
    }

    return requiresEmailConfirmation ? 'confirmation-required' : 'signed-in';
  };

  const loginWithGoogleFast = async (): Promise<GoogleFastResult> => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const gUser = res.user;
      const email = (gUser.email || '').trim().toLowerCase();
      const displayName = gUser.displayName || 'Customer';
      const uid = gUser.uid;

      if (isPrivilegedEmail(email)) {
        await auth.signOut();
        throw new Error('Admin and staff accounts must sign in with their email and password.');
      }

      return {
        needsDetails: true,
        googleUser: {
          uid,
          email,
          displayName,
        },
      };
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      throw new Error(err?.message || 'Google Sign-In failed. Please try again.');
    }
  };

  const completeGoogleSignUp = async (params: {
    uid: string;
    displayName: string;
    email: string;
    phone: string;
    address: string;
  }): Promise<boolean> => {
    const result = await signupAs({
      uid: params.uid,
      name: params.displayName,
      email: params.email,
      phone: params.phone,
      address: params.address,
      provider: 'google',
    });
    return result === 'signed-in';
  };

  const logout = async () => {
    const { error } = await auth.signOut();
    if (error) throw error;
    setCurrentUser(GUEST_USER);
    localStorage.removeItem('exins_user');
  };

  // State collections - initialized strictly empty as requested: "Don’t add initial data because im the one who will add this, no limitation to add."
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [bales, setBales] = useState<Bale[]>(() => {
    const saved = localStorage.getItem('exins_bales');
    return saved ? JSON.parse(saved) : [];
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('exins_categories');
    return saved ? JSON.parse(saved) : [];
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('exins_products');
    return saved ? JSON.parse(saved) : [];
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('exins_suppliers');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenseAccounts, setExpenseAccounts] = useState<ExpenseAccount[]>(() => {
    const saved = localStorage.getItem('exins_expense_accounts');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('exins_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('exins_orders');
    return saved ? (JSON.parse(saved) as Order[]).map(normalizeOrder) : [];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('exins_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [itemStatusLogs, setItemStatusLogs] = useState<ItemStatusLog[]>(() => {
    const saved = localStorage.getItem('exins_item_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [formAlert, setFormAlert] = useState<string | null>(null);
  const showFormAlert = (message = 'You have been successfully submitted the form!') => {
    setFormAlert(message);
  };
  const clearFormAlert = () => setFormAlert(null);

  const moveRecordsToTrash = async (
    records: { table_name: string; record_id: string }[],
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('exins_trash_records', { p_records: records });
      if (error) throw error;
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'exbin_trash');
      showFormAlert('Could not move the selected item to exBIN. Nothing was deleted.');
      return false;
    }
  };

  const fetchTrashItems = async (): Promise<TrashItem[]> => {
    if (currentUser.role !== 'owner') {
      throw new Error('Only the owner can view exBIN.');
    }
    const { data, error } = await supabase
      .from('exbin_trash')
      .select('id, table_name, record_id, record_data, deleted_at, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      tableName: row.table_name,
      recordId: row.record_id,
      recordData: row.record_data as Record<string, unknown>,
      deletedAt: row.deleted_at,
      expiresAt: row.expires_at,
    }));
  };

  const restoreTrashItems = async (ids: string[]): Promise<void> => {
    if (currentUser.role !== 'owner') {
      throw new Error('Only the owner can restore items from exBIN.');
    }
    if (!ids.length) return;
    const { error } = await supabase.rpc('exins_restore_trash', { p_trash_ids: ids });
    if (error) throw error;
  };

  useEffect(() => {
    if (formAlert) {
      const timer = setTimeout(() => {
        setFormAlert(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [formAlert]);

  // Sync state to localStorage cache
  useEffect(() => {
    localStorage.removeItem('exins_customers');
  }, []);
  useEffect(() => {
    localStorage.setItem('exins_bales', JSON.stringify(bales));
  }, [bales]);
  useEffect(() => {
    localStorage.setItem('exins_categories', JSON.stringify(categories));
  }, [categories]);
  useEffect(() => {
    localStorage.setItem('exins_products', JSON.stringify(products));
  }, [products]);
  useEffect(() => {
    localStorage.setItem('exins_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);
  useEffect(() => {
    localStorage.setItem('exins_expense_accounts', JSON.stringify(expenseAccounts));
  }, [expenseAccounts]);
  useEffect(() => {
    localStorage.setItem('exins_expenses', JSON.stringify(expenses));
  }, [expenses]);
  useEffect(() => {
    localStorage.setItem('exins_orders', JSON.stringify(orders));
  }, [orders]);
  useEffect(() => {
    localStorage.setItem('exins_transactions', JSON.stringify(transactions));
  }, [transactions]);
  useEffect(() => {
    localStorage.setItem('exins_item_logs', JSON.stringify(itemStatusLogs));
  }, [itemStatusLogs]);
  // Firestore real-time listeners on startup
  useEffect(() => {

    // Listeners with graceful fallback
    const unsubBales = onSnapshot(
      query(collection(db, 'bales')),
      (snapshot) => {
        const loaded: Bale[] = [];
        snapshot.forEach((d) => loaded.push({ ...(d.data() as Bale), id: d.id }));
        setBales(loaded);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'bales')
    );

    const unsubCategories = onSnapshot(
      query(collection(db, 'categories')),
      (snapshot) => {
        const loaded: Category[] = [];
        snapshot.forEach((d) => loaded.push({ ...(d.data() as Category), id: d.id }));
        if (loaded.length > 0) {
          setCategories(loaded);
        } else {
          // If Firestore is empty, check if we have local categories to persist into Firestore
          const localSaved = localStorage.getItem('exins_categories');
          if (localSaved) {
            try {
              const localCats: Category[] = JSON.parse(localSaved);
              if (localCats.length > 0) {
                setCategories(localCats);
                if (currentUser.role === 'owner') {
                  localCats.forEach((c) => {
                    setDoc(doc(db, 'categories', c.id), cleanFirestoreData(c)).catch(console.warn);
                  });
                }
                return;
              }
            } catch {
              // ignore
            }
          }
          setCategories([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'categories')
    );

    const unsubProducts = onSnapshot(
      query(collection(db, 'products')),
      (snapshot) => {
        const loaded: Product[] = [];
        snapshot.forEach((d) => loaded.push({ ...(d.data() as Product), id: d.id }));
        if (loaded.length > 0) {
          setProducts(loaded);
        } else {
          // If Firestore is empty, check if we have local products to persist into Firestore
          const localSaved = localStorage.getItem('exins_products');
          if (localSaved) {
            try {
              const localProds: Product[] = JSON.parse(localSaved);
              if (localProds.length > 0) {
                setProducts(localProds);
                if (currentUser.role === 'owner') {
                  localProds.forEach((p) => {
                    setDoc(doc(db, 'products', p.id), cleanFirestoreData(p)).catch(console.warn);
                  });
                }
                return;
              }
            } catch {
              // ignore
            }
          }
          setProducts([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'products')
    );

    const unsubSuppliers = onSnapshot(
      query(collection(db, 'suppliers')),
      (snapshot) => {
        const loaded: Supplier[] = [];
        snapshot.forEach((d) => loaded.push({ ...(d.data() as Supplier), id: d.id }));
        setSuppliers(loaded);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'suppliers')
    );

    const unsubExpenseAcc = onSnapshot(
      query(collection(db, 'expense_accounts')),
      (snapshot) => {
        const loaded: ExpenseAccount[] = [];
        snapshot.forEach((d) => loaded.push({ ...(d.data() as ExpenseAccount), id: d.id }));
        setExpenseAccounts(loaded);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'expense_accounts')
    );

    const unsubExpenses = onSnapshot(
      query(collection(db, 'expenses')),
      (snapshot) => {
        const loaded: Expense[] = [];
        snapshot.forEach((d) => loaded.push({ ...(d.data() as Expense), id: d.id }));
        setExpenses(loaded);
        localStorage.setItem('exins_expenses', JSON.stringify(loaded));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'expenses')
    );

    const unsubOrders = onSnapshot(
      query(collection(db, 'orders')),
      (snapshot) => {
        const loaded: Order[] = [];
        snapshot.forEach((d) => loaded.push(normalizeOrder({ ...(d.data() as Order), id: d.id })));

        if (currentUser.role !== 'owner') {
          setOrders(loaded);
          return;
        }

        setOrders((prev) => {
          const orderMap = new Map<string, Order>();
          // 1. Existing orders in memory
          prev.forEach((o) => orderMap.set(o.id, normalizeOrder(o)));

          // 2. Existing orders in localStorage cache
          try {
            const saved = localStorage.getItem('exins_orders');
            if (saved) {
              const localList: Order[] = JSON.parse(saved);
              localList.map(normalizeOrder).forEach((o) => {
                if (!orderMap.has(o.id)) orderMap.set(o.id, o);
              });
            }
          } catch {
            // ignore
          }

          // 3. Remote orders from Firestore (source of truth for synced docs)
          loaded.forEach((o) => orderMap.set(o.id, normalizeOrder(o)));

          const merged = Array.from(orderMap.values());
          localStorage.setItem('exins_orders', JSON.stringify(merged));

          // If there are locally created orders not yet in Firestore, sync them now
          const missingInCloud = merged.filter((o) => !loaded.some((ld) => ld.id === o.id));
          if (missingInCloud.length > 0) {
            missingInCloud.forEach((o) => {
              setDoc(doc(db, 'orders', o.id), cleanFirestoreData(o)).catch(console.warn);
            });
          }

          return merged;
        });
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'orders')
    );

    const unsubTransactions = onSnapshot(
      query(collection(db, 'transactions')),
      (snapshot) => {
        const loaded: Transaction[] = [];
        snapshot.forEach((d) => loaded.push({ ...(d.data() as Transaction), id: d.id }));
        setTransactions(loaded);
        localStorage.setItem('exins_transactions', JSON.stringify(loaded));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'transactions')
    );

    const unsubCustomers =
      currentUser.role === 'owner' || currentUser.role === 'staff'
        ? onSnapshot(
            query(collection(db, 'customers')),
            (snapshot) => {
              const loaded: CustomerSummary[] = [];
              snapshot.forEach((d) => loaded.push({ ...(d.data() as CustomerSummary), id: d.id }));
              setCustomers(loaded);
            },
            (error) => handleFirestoreError(error, OperationType.LIST, 'customers')
          )
        : () => setCustomers([]);

    const unsubItemLogs = onSnapshot(
      query(collection(db, 'item_logs')),
      (snapshot) => {
        const loaded: ItemStatusLog[] = [];
        snapshot.forEach((d) => loaded.push({ ...(d.data() as ItemStatusLog), id: d.id }));
        setItemStatusLogs(loaded);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'item_logs')
    );

    return () => {
      unsubBales();
      unsubCategories();
      unsubProducts();
      unsubSuppliers();
      unsubExpenseAcc();
      unsubExpenses();
      unsubOrders();
      unsubTransactions();
      unsubCustomers();
      unsubItemLogs();
    };
  }, [currentUser.uid, currentUser.role]);

  // Update dynamic aggregates (category total in stock, expense account total spent, supplier bale count)
  useEffect(() => {
    // Sync category stock count
    setCategories((prev) =>
      prev.map((cat) => {
        const inStock = products
          .filter((p) => p.category?.toLowerCase() === cat.name?.toLowerCase())
          .reduce((sum, p) => sum + (p.availableQuantity || 0), 0);
        return inStock !== cat.totalInStock ? { ...cat, totalInStock: inStock } : cat;
      })
    );

    // Sync expense account total spent
    setExpenseAccounts((prev) =>
      prev.map((acc) => {
        const spent = expenses
          .filter((e) => e.accountId === acc.id || e.accountName === acc.name)
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        return spent !== acc.totalSpent ? { ...acc, totalSpent: spent } : acc;
      })
    );

    // Sync supplier bales sourced
    setSuppliers((prev) =>
      prev.map((supp) => {
        const count = bales.filter((b) => b.supplierId === supp.id || b.supplierName === supp.name).length;
        return count !== supp.totalBalesSourced ? { ...supp, totalBalesSourced: count } : supp;
      })
    );
  }, [products, expenses, bales]);

  // Auto-heal orders: if a transaction exists with an order reference, ensure the order is present in orders state and Firestore
  useEffect(() => {
    if (transactions.length > 0) {
      const missingTxs = transactions.filter((tx) => {
        if (tx.flowType !== 'inflow') return false;
        if (tx.category !== 'POS Sales' && !tx.orderId?.startsWith('pos_')) return false;
        const linkedId = tx.orderId;
        if (!linkedId) return false;
        return !orders.some((o) => o.id === linkedId);
      });

      if (missingTxs.length > 0) {
        missingTxs.forEach(async (tx) => {
          const ordNumMatch = tx.description?.match(/#(EX-[0-9]+|POS-[0-9]+)/);
          const orderNum = ordNumMatch
            ? ordNumMatch[1]
            : `POS-${Date.now().toString().slice(-6)}`;

          const custNameMatch = tx.description?.match(/\(([^)]+)\)/);
          const custName = custNameMatch ? custNameMatch[1] : 'Walk-in Customer';

          const matchedLog = itemStatusLogs.find(
            (l) => l.notes && l.notes.includes(orderNum)
          );

          const matchedProduct = matchedLog
            ? products.find((p) => p.id === matchedLog.productId)
            : null;

          const restoredOrder: Order = {
            id: tx.orderId!,
            orderNumber: orderNum,
            customerName: custName,
            items: matchedLog
              ? [
                  {
                    productId: matchedLog.productId,
                    name: matchedLog.productName,
                    size: matchedProduct?.size || 'Free Size',
                    price: matchedProduct?.sellingPrice || tx.inflow || 0,
                    costPrice: matchedProduct?.costPrice || 0,
                    quantity: matchedLog.quantity || 1,
                    imageUrl: matchedProduct?.imageUrl || '',
                    baleCode: matchedProduct?.baleCode || '',
                  },
                ]
              : [
                  {
                    productId: 'recovered',
                    name: 'Store Item',
                    size: 'Free Size',
                    price: tx.inflow || 0,
                    costPrice: 0,
                    quantity: 1,
                    imageUrl: '',
                    baleCode: '',
                  },
                ],
            totalAmount: matchedProduct ? matchedProduct.sellingPrice : tx.inflow || 0,
            status: 'completed',
            discount: 0,
            amountTendered: tx.inflow || 0,
            changeAmount: 0,
            paymentMethod: tx.paymentMethod || 'gcash',
            createdAt: tx.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setOrders((prev) => {
            const updated = [restoredOrder, ...prev.filter((o) => o.id !== restoredOrder.id)];
            localStorage.setItem('exins_orders', JSON.stringify(updated));
            return updated;
          });
          await setDoc(doc(db, 'orders', restoredOrder.id), cleanFirestoreData(restoredOrder)).catch(
            console.warn
          );
        });
      }
    }
  }, [transactions, orders, itemStatusLogs, products]);

  // Bale Management
  const addBale = async (baleData: Omit<Bale, 'id' | 'totalSalesMade' | 'createdAt'>) => {
    const id = `bale_${Date.now()}`;
    const newBale: Bale = {
      ...baleData,
      id,
      totalSalesMade: 0,
      createdAt: new Date().toISOString(),
    };
    setBales((prev) => [newBale, ...prev]);

    try {
      await setDoc(doc(db, 'bales', id), newBale);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `bales/${id}`);
    }
  };

  const updateBale = async (id: string, updates: Partial<Bale>) => {
    setBales((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    try {
      await updateDoc(doc(db, 'bales', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bales/${id}`);
    }
  };

  const deleteBale = async (id: string) => {
    if (!(await moveRecordsToTrash([{ table_name: 'bales', record_id: id }]))) return;
    setBales((prev) => prev.filter((b) => b.id !== id));
  };

  // Category Management
  const addCategory = async (catData: Omit<Category, 'id' | 'totalInStock' | 'createdAt'>) => {
    const id = `cat_${Date.now()}`;
    const newCat: Category = {
      ...catData,
      id,
      totalInStock: 0,
      createdAt: new Date().toISOString(),
    };
    setCategories((prev) => [newCat, ...prev]);

    try {
      await setDoc(doc(db, 'categories', id), cleanFirestoreData(newCat));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `categories/${id}`);
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    try {
      await updateDoc(doc(db, 'categories', id), cleanFirestoreData(updates));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `categories/${id}`);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!(await moveRecordsToTrash([{ table_name: 'categories', record_id: id }]))) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Product Management
  const addProduct = async (prodData: Omit<Product, 'id' | 'createdAt'>) => {
    const id = `prod_${Date.now()}`;
    const newProd: Product = {
      ...prodData,
      barcode: prodData.barcode.trim() || generateProductBarcode(products),
      id,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProd, ...prev]);

    try {
      await setDoc(doc(db, 'products', id), cleanFirestoreData(newProd));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `products/${id}`);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    try {
      await updateDoc(doc(db, 'products', id), cleanFirestoreData(updates));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!(await moveRecordsToTrash([{ table_name: 'products', record_id: id }]))) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Supplier Management
  const addSupplier = async (suppData: Omit<Supplier, 'id' | 'totalBalesSourced' | 'createdAt'>) => {
    const id = `supp_${Date.now()}`;
    const newSupp: Supplier = {
      ...suppData,
      id,
      totalBalesSourced: 0,
      createdAt: new Date().toISOString(),
    };
    setSuppliers((prev) => [newSupp, ...prev]);

    try {
      await setDoc(doc(db, 'suppliers', id), newSupp);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `suppliers/${id}`);
    }
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    try {
      await updateDoc(doc(db, 'suppliers', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `suppliers/${id}`);
    }
  };

  const deleteSupplier = async (id: string) => {
    if (!(await moveRecordsToTrash([{ table_name: 'suppliers', record_id: id }]))) return;
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };

  // Expense Account Management
  const addExpenseAccount = async (accData: Omit<ExpenseAccount, 'id' | 'totalSpent' | 'createdAt'>) => {
    const id = `acc_${Date.now()}`;
    const newAcc: ExpenseAccount = {
      ...accData,
      id,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
    };
    setExpenseAccounts((prev) => [newAcc, ...prev]);

    try {
      await setDoc(doc(db, 'expense_accounts', id), newAcc);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `expense_accounts/${id}`);
    }
  };

  const updateExpenseAccount = async (id: string, updates: Partial<ExpenseAccount>) => {
    setExpenseAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    try {
      await updateDoc(doc(db, 'expense_accounts', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `expense_accounts/${id}`);
    }
  };

  const deleteExpenseAccount = async (id: string) => {
    if (!(await moveRecordsToTrash([{ table_name: 'expense_accounts', record_id: id }]))) return;
    setExpenseAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  // Expense Management
  const addExpense = async (expData: Omit<Expense, 'id' | 'createdAt'>) => {
    const id = `exp_${Date.now()}`;
    const newExp: Expense = {
      ...expData,
      id,
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [newExp, ...prev]);

    // Automatically record an outflow in Transaction History
    const txId = `tx_${Date.now()}`;
    const newTx: Transaction = {
      id: txId,
      date: expData.date || new Date().toISOString().split('T')[0],
      flowType: 'outflow',
      category: 'Disbursement',
      account: expData.accountName,
      description: expData.description || `Disbursement for ${expData.accountName}`,
      paymentMethod: expData.paymentMethod,
      inflow: 0,
      outflow: expData.amount,
      expenseId: id,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);

    try {
      await setDoc(doc(db, 'expenses', id), newExp);
      await setDoc(doc(db, 'transactions', txId), newTx);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `expenses/${id}`);
    }
  };

  const deleteExpense = async (id: string) => {
    const matchingTx = transactions.find(
      (t) => t.expenseId === id || (t.flowType === 'outflow' && t.account === id)
    );
    const records = [{ table_name: 'expenses', record_id: id }];
    if (matchingTx) records.push({ table_name: 'transactions', record_id: matchingTx.id });
    if (!(await moveRecordsToTrash(records))) return;

    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (matchingTx) setTransactions((prev) => prev.filter((t) => t.id !== matchingTx.id));
  };

  // Transactions
  const addTransaction = async (txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    const id = `tx_${Date.now()}`;
    const newTx: Transaction = {
      ...txData,
      id,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);

    try {
      await setDoc(doc(db, 'transactions', id), newTx);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `transactions/${id}`);
    }
  };

  const deleteTransaction = async (id: string) => {
    const targetTx = transactions.find((t) => t.id === id);
    const linkedOrder = targetTx?.orderId
      ? orders.find((order) => order.id === targetTx.orderId)
      : targetTx?.description
        ? orders.find(
            (order) =>
              targetTx.description.includes(order.orderNumber) ||
              targetTx.description.includes(order.id),
          )
        : undefined;
    const linkedExpense = targetTx?.expenseId
      ? expenses.find((expense) => expense.id === targetTx.expenseId)
      : targetTx?.flowType === 'outflow'
        ? expenses.find(
            (expense) =>
              (targetTx.account &&
                expense.accountName === targetTx.account &&
                expense.amount === targetTx.outflow) ||
              (targetTx.description && targetTx.description.includes(expense.id)),
          )
        : undefined;
    const records = [{ table_name: 'transactions', record_id: id }];
    if (linkedOrder) records.push({ table_name: 'orders', record_id: linkedOrder.id });
    if (linkedExpense) records.push({ table_name: 'expenses', record_id: linkedExpense.id });
    if (!(await moveRecordsToTrash(records))) return;

    setTransactions((prev) => prev.filter((transaction) => transaction.id !== id));
    if (linkedOrder) setOrders((prev) => prev.filter((order) => order.id !== linkedOrder.id));
    if (linkedExpense) setExpenses((prev) => prev.filter((expense) => expense.id !== linkedExpense.id));
  };

  // POS Sale Completion
  const completePosSale = async (params: {
    items: { product: Product; quantity: number }[];
    date: string;
    customerName?: string;
    discount: number;
    paymentMethod: 'cash' | 'gcash';
    amountTendered: number;
  }): Promise<Order> => {
    const orderItems: OrderItem[] = params.items.map(({ product, quantity }) => ({
      productId: product.id,
      name: product.name,
      size: product.size || 'Free Size',
      price: product.sellingPrice,
      costPrice: product.costPrice || 0,
      quantity,
      imageUrl: product.imageUrl,
      baleCode: product.baleCode,
    }));

    const rawTotal = params.items.reduce(
      (sum, { product, quantity }) => sum + product.sellingPrice * quantity,
      0
    );
    const totalAmount = Math.max(0, rawTotal - params.discount);
    const changeAmount = Math.max(0, params.amountTendered - totalAmount);

    const [saleYear, saleMonth, saleDay] = params.date.split('-').map(Number);
    const now = new Date();
    const saleTimestamp = new Date(
      saleYear,
      saleMonth - 1,
      saleDay,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds(),
    );
    if (
      !Number.isFinite(saleTimestamp.getTime()) ||
      saleTimestamp.getFullYear() !== saleYear ||
      saleTimestamp.getMonth() !== saleMonth - 1 ||
      saleTimestamp.getDate() !== saleDay
    ) {
      throw new Error('Enter a valid sale date.');
    }

    const id = `pos_${Date.now()}`;
    const orderNumber = `POS-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder: Order = {
      id,
      orderNumber,
      customerName: params.customerName || 'Walk-in Customer',
      items: orderItems,
      totalAmount,
      status: 'completed',
      discount: params.discount,
      amountTendered: params.amountTendered,
      changeAmount,
      paymentMethod: params.paymentMethod,
      createdAt: saleTimestamp.toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Deduct inventory
    params.items.forEach(({ product, quantity }) => {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === product.id) {
            const newQty = Math.max(0, p.availableQuantity - quantity);
            updateProduct(p.id, { availableQuantity: newQty });
            return { ...p, availableQuantity: newQty };
          }
          return p;
        })
      );

      // Increment bale sales
      if (product.baleCode) {
        setBales((prev) =>
          prev.map((b) => {
            if (b.baleCode === product.baleCode) {
              const itemTotal = product.sellingPrice * quantity;
              const newSales = (b.totalSalesMade || 0) + itemTotal;
              updateBale(b.id, { totalSalesMade: newSales });
              return { ...b, totalSalesMade: newSales };
            }
            return b;
          })
        );
      }

      // Log sold
      logItemStatus({
        productId: product.id,
        productName: product.name,
        type: 'sold',
        quantity,
        notes: `POS transaction #${orderNumber}`,
        adjustStock: false,
      });
    });

    // Record inflow transaction in Finance
    const txId = `tx_${Date.now()}`;
    const newTx: Transaction = {
      id: txId,
      date: params.date,
      flowType: 'inflow',
      category: 'POS Sales',
      account: 'Store Counter Sales',
      description: `POS counter sale #${orderNumber} (${params.customerName || 'Walk-in'})`,
      paymentMethod: params.paymentMethod,
      inflow: totalAmount,
      outflow: 0,
      orderId: id,
      createdAt: saleTimestamp.toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);

    try {
      await setDoc(doc(db, 'orders', id), cleanFirestoreData(newOrder));
      await setDoc(doc(db, 'transactions', txId), cleanFirestoreData(newTx));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${id}`);
    }

    return newOrder;
  };

  // Item status logging (Sold, Returned, Damaged, Lost)
  const logItemStatus = async (params: {
    productId: string;
    productName: string;
    type: 'sold' | 'returned' | 'damaged' | 'lost';
    quantity: number;
    notes?: string;
    adjustStock?: boolean;
  }) => {
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newLog: ItemStatusLog = {
      id,
      productId: params.productId,
      productName: params.productName,
      type: params.type,
      quantity: params.quantity,
      date: new Date().toISOString().split('T')[0],
      notes: params.notes,
      createdAt: new Date().toISOString(),
    };

    setItemStatusLogs((prev) => [newLog, ...prev]);

    try {
      await setDoc(doc(db, 'item_logs', id), cleanFirestoreData(newLog));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `item_logs/${id}`);
    }

    // If stock adjustment is requested
    if (params.adjustStock) {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === params.productId) {
            let newQty = p.availableQuantity;
            if (params.type === 'returned') {
              newQty += params.quantity;
            } else if (params.type === 'damaged' || params.type === 'lost') {
              newQty = Math.max(0, newQty - params.quantity);
            }
            updateProduct(p.id, { availableQuantity: newQty });
            return { ...p, availableQuantity: newQty };
          }
          return p;
        })
      );
    }
  };

  // Update Item Status Log (e.g. mark lost item as found, update notes, restore stock)
  const updateItemStatusLog = async (
    id: string,
    updates: Partial<ItemStatusLog>,
    options?: {
      restoreStock?: boolean;
      productId?: string;
      quantityToRestore?: number;
    }
  ) => {
    setItemStatusLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, ...updates } : log))
    );

    try {
      await updateDoc(doc(db, 'item_logs', id), cleanFirestoreData(updates));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `item_logs/${id}`);
    }

    if (
      options?.restoreStock &&
      options?.productId &&
      options?.quantityToRestore &&
      options.quantityToRestore > 0
    ) {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === options.productId) {
            const restored = (p.availableQuantity || 0) + options.quantityToRestore!;
            updateProduct(p.id, { availableQuantity: restored });
            return { ...p, availableQuantity: restored };
          }
          return p;
        })
      );
    }
  };

  const deleteItemStatusLog = async (id: string) => {
    if (!(await moveRecordsToTrash([{ table_name: 'item_logs', record_id: id }]))) return;
    setItemStatusLogs((prev) => prev.filter((log) => log.id !== id));
  };

  return (
    <StoreContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        currentUser,
        customers,
        loginAs,
        resendSignupConfirmation,
        signupAs,
        loginWithGoogleFast,
        completeGoogleSignUp,
        logout,
        bales,
        categories,
        products,
        suppliers,
        expenseAccounts,
        expenses,
        orders,
        transactions,
        itemStatusLogs,
        formAlert,
        showFormAlert,
        clearFormAlert,
        addBale,
        updateBale,
        deleteBale,
        addCategory,
        updateCategory,
        deleteCategory,
        addProduct,
        updateProduct,
        deleteProduct,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addExpenseAccount,
        updateExpenseAccount,
        deleteExpenseAccount,
        addExpense,
        deleteExpense,
        addTransaction,
        deleteTransaction,
        completePosSale,
        logItemStatus,
        updateItemStatusLog,
        deleteItemStatusLog,
        fetchTrashItems,
        restoreTrashItems,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
