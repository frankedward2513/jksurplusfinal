import type {
  Bale,
  Category,
  CustomerSummary,
  Expense,
  ExpenseAccount,
  ItemStatusLog,
  Order,
  Product,
  Supplier,
  Transaction,
} from '../types';

export interface AiBusinessData {
  products: Product[];
  bales: Bale[];
  categories: Category[];
  suppliers: Supplier[];
  expenseAccounts: ExpenseAccount[];
  expenses: Expense[];
  orders: Order[];
  transactions: Transaction[];
  itemStatusLogs: ItemStatusLog[];
  customers: CustomerSummary[];
}

function numberValue(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function dateKey(value: string | undefined): string | null {
  if (!value) return null;
  const isoDate = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  if (isoDate) return isoDate[1];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthKey(value: string | undefined): string | null {
  const date = dateKey(value);
  return date ? date.slice(0, 7) : null;
}

function getRecentMonthKeys(now: Date, count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - count + index + 1, 1);
    return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  });
}

function displayCurrency(value: number): string {
  return `₱${value.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
}

export function buildAiBusinessContext(data: AiBusinessData, now = new Date()) {
  const productById = new Map(data.products.map((product) => [product.id, product]));
  const monthlySales = new Map<string, { orderIds: Set<string>; revenue: number; unitsSold: number }>();
  const categorySales = new Map<string, {
    name: string;
    orderIds: Set<string>;
    revenue: number;
    grossProfit: number;
    costedUnits: number;
    unitsSold: number;
    monthlyRevenue: Map<string, number>;
    monthlyUnits: Map<string, number>;
  }>();
  const productSales = new Map<string, {
    name: string;
    category: string;
    revenue: number;
    grossProfit: number;
    costedUnits: number;
    unitsSold: number;
    orderIds: Set<string>;
  }>();
  let orderCount = 0;
  let cancelledOrderCount = 0;
  let salesRevenue = 0;
  let grossProfit = 0;
  let totalCostedUnits = 0;
  let totalUnitsSold = 0;

  const ensureCategory = (name: string) => {
    const label = name || 'Uncategorized';
    const key = label.toLocaleLowerCase();
    let metric = categorySales.get(key);
    if (!metric) {
      metric = {
        name: label,
        orderIds: new Set<string>(),
        revenue: 0,
        grossProfit: 0,
        costedUnits: 0,
        unitsSold: 0,
        monthlyRevenue: new Map<string, number>(),
        monthlyUnits: new Map<string, number>(),
      };
      categorySales.set(key, metric);
    }
    return metric;
  };

  data.orders.forEach((order, orderIndex) => {
    if (order.status === 'cancelled') {
      cancelledOrderCount += 1;
      return;
    }

    orderCount += 1;
    const orderId = order.id || order.orderNumber || `order-${orderIndex}`;
    const orderMonth = monthKey(order.createdAt);
    const items = Array.isArray(order.items) ? order.items : [];
    const lines = items.map((item) => {
      const product = productById.get(item.productId);
      const category = textValue(item.category) || textValue(product?.category) || 'Uncategorized';
      const name = textValue(item.name) || textValue(product?.name) || 'Unknown product';
      const quantity = Math.max(0, numberValue(item.quantity));
      const unitPrice = Math.max(0, numberValue(item.price));
      return {
        item,
        category,
        name,
        quantity,
        grossRevenue: quantity * unitPrice,
        unitCost: item.costPrice == null && product?.costPrice == null
          ? null
          : Math.max(0, numberValue(item.costPrice ?? product?.costPrice)),
      };
    });
    const grossOrderRevenue = lines.reduce((sum, line) => sum + line.grossRevenue, 0);
    const orderNetRevenue = Math.max(0, numberValue(order.totalAmount));
    salesRevenue += orderNetRevenue;

    if (orderMonth) {
      let month = monthlySales.get(orderMonth);
      if (!month) {
        month = { orderIds: new Set<string>(), revenue: 0, unitsSold: 0 };
        monthlySales.set(orderMonth, month);
      }
      month.orderIds.add(orderId);
      month.revenue += orderNetRevenue;
    }

    lines.forEach((line) => {
      const allocatedRevenue = grossOrderRevenue > 0
        ? orderNetRevenue * (line.grossRevenue / grossOrderRevenue)
        : 0;
      totalUnitsSold += line.quantity;
      const category = ensureCategory(line.category);
      category.orderIds.add(orderId);
      category.revenue += allocatedRevenue;
      if (line.unitCost !== null) {
        const lineGrossProfit = allocatedRevenue - line.unitCost * line.quantity;
        category.grossProfit += lineGrossProfit;
        category.costedUnits += line.quantity;
        grossProfit += lineGrossProfit;
        totalCostedUnits += line.quantity;
      }
      category.unitsSold += line.quantity;
      if (orderMonth) {
        category.monthlyRevenue.set(
          orderMonth,
          (category.monthlyRevenue.get(orderMonth) || 0) + allocatedRevenue,
        );
        category.monthlyUnits.set(
          orderMonth,
          (category.monthlyUnits.get(orderMonth) || 0) + line.quantity,
        );
        const month = monthlySales.get(orderMonth);
        if (month) month.unitsSold += line.quantity;
      }

      const productKey = line.item.productId || line.name.toLocaleLowerCase();
      let productMetric = productSales.get(productKey);
      if (!productMetric) {
        productMetric = {
          name: line.name,
          category: line.category,
          revenue: 0,
          grossProfit: 0,
          costedUnits: 0,
          unitsSold: 0,
          orderIds: new Set<string>(),
        };
        productSales.set(productKey, productMetric);
      }
      productMetric.revenue += allocatedRevenue;
      if (line.unitCost !== null) {
        productMetric.grossProfit += allocatedRevenue - line.unitCost * line.quantity;
        productMetric.costedUnits += line.quantity;
      }
      productMetric.unitsSold += line.quantity;
      productMetric.orderIds.add(orderId);
    });
  });

  const categoryPerformance = [...categorySales.values()]
    .map((metric) => ({
      category: metric.name,
      revenue: Number(metric.revenue.toFixed(2)),
      grossProfit: Number(metric.grossProfit.toFixed(2)),
      costedUnits: metric.costedUnits,
      unitsSold: metric.unitsSold,
      orderCount: metric.orderIds.size,
    }))
    .sort((left, right) => right.revenue - left.revenue || right.unitsSold - left.unitsSold);

  const categoryUnitsRanking = [...categoryPerformance]
    .sort((left, right) => right.unitsSold - left.unitsSold || right.revenue - left.revenue);

  const productPerformance = [...productSales.values()]
    .map((metric) => ({
      product: metric.name,
      category: metric.category,
      revenue: Number(metric.revenue.toFixed(2)),
      grossProfit: Number(metric.grossProfit.toFixed(2)),
      costedUnits: metric.costedUnits,
      unitsSold: metric.unitsSold,
      orderCount: metric.orderIds.size,
    }))
    .sort((left, right) => right.revenue - left.revenue || right.unitsSold - left.unitsSold);

  const historyMonths = getRecentMonthKeys(now, 12);
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const nextMonthCategoryForecast = [...categorySales.values()]
    .filter((metric) =>
      historyMonths.some((month) => (metric.monthlyRevenue.get(month) || 0) > 0)
    )
    .map((metric) => {
      const revenues = historyMonths.map((month) => metric.monthlyRevenue.get(month) || 0);
      const units = historyMonths.map((month) => metric.monthlyUnits.get(month) || 0);
      let revenueForecast = revenues[0] || 0;
      let unitsForecast = units[0] || 0;
      for (let index = 1; index < historyMonths.length; index += 1) {
        revenueForecast = 0.3 * revenues[index] + 0.7 * revenueForecast;
        unitsForecast = 0.3 * units[index] + 0.7 * unitsForecast;
      }
      const recentAverage = revenues.slice(-3).reduce((sum, value) => sum + value, 0) /
        Math.min(3, revenues.length);
      const monthsWithSales = revenues.filter((value) => value > 0).length;
      return {
        category: metric.name,
        forecastRevenue: Number(revenueForecast.toFixed(2)),
        forecastUnits: Number(unitsForecast.toFixed(1)),
        recentThreeMonthAverage: Number(recentAverage.toFixed(2)),
        changePercent: recentAverage > 0
          ? Number((((revenueForecast - recentAverage) / recentAverage) * 100).toFixed(1))
          : null,
        monthsWithSales,
      };
    })
    .sort((left, right) => right.forecastRevenue - left.forecastRevenue);
  const nextMonthCategoryUnitsRanking = [...nextMonthCategoryForecast]
    .sort((left, right) => right.forecastUnits - left.forecastUnits || right.forecastRevenue - left.forecastRevenue);

  const monthlyExpenses = new Map<string, { amount: number; recordCount: number }>();
  const expensesByAccount = new Map<string, {
    name: string;
    actualAmount: number;
    currentMonthAmount: number;
    recordCount: number;
    monthlyBudget: number;
    reportedTotalSpent: number;
  }>();
  data.expenseAccounts.forEach((account) => {
    const key = account.id || account.name.toLocaleLowerCase();
    expensesByAccount.set(key, {
      name: account.name,
      actualAmount: 0,
      currentMonthAmount: 0,
      recordCount: 0,
      monthlyBudget: numberValue(account.monthlyBudget),
      reportedTotalSpent: numberValue(account.totalSpent),
    });
  });
  let totalExpenses = 0;
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  data.expenses.forEach((expense) => {
    const amount = Math.max(0, numberValue(expense.amount));
    totalExpenses += amount;
    const key = expense.accountId || expense.accountName.toLocaleLowerCase();
    const account = expensesByAccount.get(key) || {
      name: expense.accountName || 'Uncategorized',
      actualAmount: 0,
      currentMonthAmount: 0,
      recordCount: 0,
      monthlyBudget: 0,
      reportedTotalSpent: 0,
    };
    account.actualAmount += amount;
    if (monthKey(expense.date) === currentMonthKey) account.currentMonthAmount += amount;
    account.recordCount += 1;
    expensesByAccount.set(key, account);

    const monthKeyValue = monthKey(expense.date);
    if (monthKeyValue) {
      const month = monthlyExpenses.get(monthKeyValue) || { amount: 0, recordCount: 0 };
      month.amount += amount;
      month.recordCount += 1;
      monthlyExpenses.set(monthKeyValue, month);
    }
  });

  const monthlyTransactions = new Map<string, {
    inflow: number;
    outflow: number;
    recordCount: number;
  }>();
  let totalInflow = 0;
  let totalOutflow = 0;
  const transactionGroups = new Map<string, {
    flowType: string;
    category: string;
    account: string;
    inflow: number;
    outflow: number;
    recordCount: number;
  }>();
  data.transactions.forEach((transaction) => {
    const inflow = Math.max(0, numberValue(transaction.inflow));
    const outflow = Math.max(0, numberValue(transaction.outflow));
    totalInflow += inflow;
    totalOutflow += outflow;
    const monthKeyValue = monthKey(transaction.date || transaction.createdAt);
    if (monthKeyValue) {
      const month = monthlyTransactions.get(monthKeyValue) || {
        inflow: 0,
        outflow: 0,
        recordCount: 0,
      };
      month.inflow += inflow;
      month.outflow += outflow;
      month.recordCount += 1;
      monthlyTransactions.set(monthKeyValue, month);
    }

    const flowType = transaction.flowType;
    const category = textValue(transaction.category) || 'Uncategorized';
    const account = textValue(transaction.account) || 'Uncategorized';
    const groupKey = `${flowType}|${category.toLocaleLowerCase()}|${account.toLocaleLowerCase()}`;
    const group = transactionGroups.get(groupKey) || {
      flowType,
      category,
      account,
      inflow: 0,
      outflow: 0,
      recordCount: 0,
    };
    group.inflow += inflow;
    group.outflow += outflow;
    group.recordCount += 1;
    transactionGroups.set(groupKey, group);
  });

  const itemLogGroups = new Map<string, {
    product: string;
    type: string;
    quantity: number;
    recordCount: number;
  }>();
  data.itemStatusLogs.forEach((log) => {
    const product = textValue(log.productName) || 'Unknown product';
    const key = `${product.toLocaleLowerCase()}|${log.type}`;
    const group = itemLogGroups.get(key) || {
      product,
      type: log.type,
      quantity: 0,
      recordCount: 0,
    };
    group.quantity += Math.max(0, numberValue(log.quantity));
    group.recordCount += 1;
    itemLogGroups.set(key, group);
  });

  const totalStockUnits = data.products.reduce(
    (sum, product) => sum + Math.max(0, numberValue(product.availableQuantity)),
    0,
  );
  const lowStockProducts = data.products
    .filter((product) => numberValue(product.availableQuantity) <= 3)
    .map((product) => ({
      name: product.name,
      category: product.category,
      stock: numberValue(product.availableQuantity),
      sellingPrice: numberValue(product.sellingPrice),
    }));

  return {
    asOf: now.toISOString(),
    coverage: {
      products: data.products.length,
      categories: data.categories.length,
      bales: data.bales.length,
      suppliers: data.suppliers.length,
      expenseAccounts: data.expenseAccounts.length,
      expenseRecords: data.expenses.length,
      nonCancelledOrders: orderCount,
      cancelledOrders: cancelledOrderCount,
      transactions: data.transactions.length,
      itemStatusLogs: data.itemStatusLogs.length,
      customerSummaries: data.customers.length,
    },
    inventory: {
      totalProducts: data.products.length,
      totalStockUnits,
      estimatedStockCostValue: Number(data.products.reduce(
        (sum, product) => sum +
          Math.max(0, numberValue(product.availableQuantity)) * Math.max(0, numberValue(product.costPrice)),
        0,
      ).toFixed(2)),
      availableProducts: data.products.filter((product) => numberValue(product.availableQuantity) > 0).length,
      lowStockThreshold: 3,
      lowStockProducts,
      products: data.products.map((product) => ({
        name: product.name,
        category: product.category,
        baleCode: product.baleCode,
        size: product.size,
        availableQuantity: numberValue(product.availableQuantity),
        sellingPrice: numberValue(product.sellingPrice),
        costPrice: numberValue(product.costPrice),
        createdAt: product.createdAt,
      })),
      categories: data.categories.map((category) => ({
        name: category.name,
        totalInStock: numberValue(category.totalInStock),
      })),
      bales: data.bales.map((bale) => ({
        code: bale.baleCode,
        name: bale.baleName,
        category: bale.category,
        supplier: bale.supplierName,
        purchaseCost: numberValue(bale.totalPurchasePrice),
        quantityPurchased: numberValue(bale.quantityPurchase),
        status: bale.status,
        totalSalesMade: numberValue(bale.totalSalesMade),
      })),
      suppliers: data.suppliers.map((supplier) => ({
        name: supplier.name,
        totalBalesSourced: numberValue(supplier.totalBalesSourced),
      })),
    },
    sales: {
      includedOrderStatuses: 'All statuses except cancelled',
      totalOrders: orderCount,
      totalRevenue: Number(salesRevenue.toFixed(2)),
      estimatedGrossProfit: Number(grossProfit.toFixed(2)),
      costedUnits: totalCostedUnits,
      totalUnitsSold,
      categoryPerformance,
      categoryUnitsRanking,
      productPerformance,
      monthlySales: [...monthlySales.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([month, values]) => ({
          month,
          orderCount: values.orderIds.size,
          revenue: Number(values.revenue.toFixed(2)),
          unitsSold: values.unitsSold,
        })),
      categoryMonthlySales: historyMonths.map((month) => ({
        month,
        categories: [...categorySales.values()].map((metric) => ({
          category: metric.name,
          revenue: Number((metric.monthlyRevenue.get(month) || 0).toFixed(2)),
          unitsSold: metric.monthlyUnits.get(month) || 0,
        })),
      })),
      nextMonth,
      forecastMethod: 'EWMA alpha 0.3 using the last 12 calendar months including the current month; cancelled orders excluded',
      nextMonthCategoryForecast,
      nextMonthCategoryUnitsRanking,
    },
    finance: {
      currentMonth: currentMonthKey,
      totalRecordedExpenses: Number(totalExpenses.toFixed(2)),
      accounts: [...expensesByAccount.values()].map((account) => {
        const budget = account.monthlyBudget;
        return {
          name: account.name,
          actualAmount: Number(account.actualAmount.toFixed(2)),
          currentMonthAmount: Number(account.currentMonthAmount.toFixed(2)),
          recordCount: account.recordCount,
          monthlyBudget: budget,
          reportedTotalSpent: account.reportedTotalSpent,
          overBudget: budget > 0 && account.currentMonthAmount > budget,
        };
      }),
      monthlyExpenses: [...monthlyExpenses.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([month, values]) => ({
          month,
          amount: Number(values.amount.toFixed(2)),
          recordCount: values.recordCount,
        })),
      expenseRecords: data.expenses.map((expense) => ({
        date: dateKey(expense.date),
        account: expense.accountName,
        amount: numberValue(expense.amount),
        paymentMethod: expense.paymentMethod,
      })),
    },
    transactions: {
      count: data.transactions.length,
      totalInflow: Number(totalInflow.toFixed(2)),
      totalOutflow: Number(totalOutflow.toFixed(2)),
      monthly: [...monthlyTransactions.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([month, values]) => ({
          month,
          inflow: Number(values.inflow.toFixed(2)),
          outflow: Number(values.outflow.toFixed(2)),
          recordCount: values.recordCount,
        })),
      byCategoryAndAccount: [...transactionGroups.values()],
    },
    itemStatus: [...itemLogGroups.values()],
    customerSummary: {
      count: data.customers.length,
      totalPurchase: Number(
        data.customers.reduce((sum, customer) => sum + Math.max(0, numberValue(customer.totalPurchase)), 0).toFixed(2),
      ),
    },
  };
}

type AiBusinessContext = ReturnType<typeof buildAiBusinessContext>;

export function getLocalBusinessAnswer(question: string, context: AiBusinessContext): string {
  const query = question.toLocaleLowerCase();
  const nextMonthQuestion = /\b(next month|forecast|forecasted|predict|prediction)\b/.test(query);
  const asksCategory = /\b(categories|category)\b/.test(query);
  const asksBestSeller = /\b(?:best.?sell(?:ing)?|top.?sell(?:ing)?|popular|highest.?sell(?:ing)?)\b/.test(query);
  const currency = displayCurrency;

  if (/\b(recommendations?|suggestions?|advice|strategy|optimize|improve|reduce|cut|save)\b/.test(query)) {
    const recommendations: string[] = [];
    const overBudgetAccounts = context.finance.accounts
      .filter((account) => account.overBudget)
      .sort((left, right) => right.currentMonthAmount - left.currentMonthAmount);
    if (overBudgetAccounts.length > 0) {
      const account = overBudgetAccounts[0];
      recommendations.push(
        `Review ${account.name}: current-month expenses are ${currency(account.currentMonthAmount)} against a ${currency(account.monthlyBudget)} budget.`,
      );
    }

    if (context.inventory.lowStockProducts.length > 0) {
      const lowStockNames = context.inventory.lowStockProducts
        .slice(0, 3)
        .map((product) => `${product.name} (${product.stock} units)`);
      recommendations.push(
        `Review replenishment for low-stock items: ${lowStockNames.join(', ')}.`,
      );
    }

    const topForecast = context.sales.nextMonthCategoryUnitsRanking[0];
    if (topForecast) {
      recommendations.push(
        `Monitor ${topForecast.category}, currently the highest projected category for ${context.sales.nextMonth} at about ${topForecast.forecastUnits.toLocaleString()} units.`,
      );
    }

    return recommendations.length
      ? `Data-based recommendations:\n${recommendations.map((item) => `• ${item}`).join('\n')}\n\nForecasts are estimates; compare them with actual sales before changing purchases.`
      : 'There is not enough current sales, stock, or expense data to make a store-specific recommendation yet.';
  }

  if (
    nextMonthQuestion &&
    /\b(sales|revenue|orders|transactions|profit|earnings?)\b/.test(query) &&
    !asksCategory
  ) {
    const forecast = /\b(revenue|sales amount|money|income)\b/.test(query)
      ? context.sales.nextMonthCategoryForecast
      : context.sales.nextMonthCategoryUnitsRanking;
    if (forecast.length === 0) {
      return 'There is not enough recent itemized sales history to estimate next month. Check that completed sales are recorded with item categories and dates.';
    }
    const byRevenue = /\b(revenue|sales amount|money|income)\b/.test(query);
    const top = forecast.slice(0, 5).map((item, index) =>
      `${index + 1}. ${item.category}: about ${item.forecastUnits.toLocaleString()} units and ${currency(item.forecastRevenue)}`,
    );
    const totalForecast = forecast.reduce((sum, item) => sum + item.forecastRevenue, 0);
    return `${byRevenue ? `Estimated category revenue for ${context.sales.nextMonth} totals about ${currency(totalForecast)}.` : `Projected best-selling categories for ${context.sales.nextMonth}, ranked by units, are:`}\n${top.join('\n')}\n\nThis EWMA projection uses the last 12 calendar months and excludes cancelled orders; it is not a guarantee.`;
  }

  if (asksCategory && nextMonthQuestion) {
    const byRevenue = /\b(revenue|sales amount|money|income)\b/.test(query);
    const results = byRevenue
      ? context.sales.nextMonthCategoryForecast
      : context.sales.nextMonthCategoryUnitsRanking;
    if (results.length === 0) {
      return 'I cannot rank categories yet because there are no non-cancelled itemized sales in the loaded order history.';
    }
    const top = results.slice(0, 5);
    const month = context.sales.nextMonth;
    const lines = top.map((item, index) => {
      const historyNote = item.monthsWithSales < 3 ? ' (limited history)' : '';
      return `${index + 1}. ${item.category}: about ${item.forecastUnits.toLocaleString()} units and ${currency(item.forecastRevenue)} revenue${historyNote}`;
    });
    return `Estimated ${byRevenue ? 'highest-revenue' : 'best-selling by units'} categories for ${month} (EWMA forecast from the last 12 months; cancelled orders excluded):\n${lines.join('\n')}\n\nThis is a projection, not a guarantee.`;
  }

  if (asksCategory && (asksBestSeller || /\b(sales|revenue|units)\b/.test(query))) {
    const byRevenue = /\b(revenue|sales amount|money|income)\b/.test(query);
    const results = byRevenue
      ? context.sales.categoryPerformance
      : context.sales.categoryUnitsRanking;
    if (results.length === 0) {
      return 'There are no non-cancelled itemized sales to rank categories yet.';
    }
    const top = results.slice(0, 5);
    const productSection = /\b(products?|items?)\b/.test(query)
      ? `\nTop products by units sold:\n${context.sales.productPerformance.slice(0, 5)
        .map((item, index) => `${index + 1}. ${item.product} (${item.category}): ${item.unitsSold.toLocaleString()} units, ${currency(item.revenue)}`)
        .join('\n')}`
      : '';
    return `Categories ranked by ${byRevenue ? 'recorded item revenue' : 'units sold'}:\n${top
      .map((item, index) => `${index + 1}. ${item.category}: ${currency(item.revenue)} across ${item.unitsSold.toLocaleString()} units${item.costedUnits > 0 ? ` (estimated gross profit ${currency(item.grossProfit)} on costed units)` : ''}`)
      .join('\n')}${productSection}`;
  }

  if (
    /\b(products?|items?)\b/.test(query) &&
    (asksBestSeller || /\b(sold|units sold|highest sales)\b/.test(query))
  ) {
    const top = context.sales.productPerformance.slice(0, 5);
    return top.length
      ? `Best-selling products by recorded item revenue:\n${top.map((item, index) =>
        `${index + 1}. ${item.product} (${item.category}): ${currency(item.revenue)} across ${item.unitsSold.toLocaleString()} units${item.costedUnits > 0 ? ` (estimated gross profit ${currency(item.grossProfit)} on costed units)` : ''}`,
      ).join('\n')}`
      : 'There are no non-cancelled itemized sales to rank products yet.';
  }

  if (/\bsuppliers?\b/.test(query)) {
    const suppliers = context.inventory.suppliers;
    return suppliers.length
      ? `Suppliers in the loaded database:\n${suppliers.map((supplier) =>
        `• ${supplier.name}: ${supplier.totalBalesSourced} bales sourced`,
      ).join('\n')}`
      : 'No supplier records are available.';
  }

  if (/\bbales?\b/.test(query)) {
    const bales = context.inventory.bales;
    return bales.length
      ? `Bales in inventory:\n${bales.slice(0, 20).map((bale) =>
        `• ${bale.code} — ${bale.name} (${bale.category}), ${bale.quantityPurchased} purchased, ${currency(bale.purchaseCost)} cost, ${bale.status}`,
      ).join('\n')}${bales.length > 20 ? `\nShowing 20 of ${bales.length} bales.` : ''}`
      : 'No bale records are available.';
  }

  if (/\b(item status|status logs?|lost|damaged|returned|found)\b/.test(query)) {
    const logs = context.itemStatus;
    return logs.length
      ? `Item status totals:\n${logs.map((log) =>
        `• ${log.product} — ${log.type}: ${log.quantity} units in ${log.recordCount} records`,
      ).join('\n')}`
      : 'No item-status records are available.';
  }

  if (/\btransactions?\b/.test(query)) {
    return `Transaction summary: ${context.transactions.count} records, ${currency(context.transactions.totalInflow)} total inflow, and ${currency(context.transactions.totalOutflow)} total outflow.\n${
      context.transactions.byCategoryAndAccount.length
        ? context.transactions.byCategoryAndAccount.map((entry) =>
          `• ${entry.category} / ${entry.account}: ${currency(entry.inflow)} inflow, ${currency(entry.outflow)} outflow (${entry.recordCount} records)`,
        ).join('\n')
        : 'No transaction records are available.'
    }`;
  }

  if (asksCategory && !nextMonthQuestion) {
    const categories = [...context.inventory.categories]
      .sort((left, right) => right.totalInStock - left.totalInStock);
    return categories.length
      ? `Inventory categories by stock:\n${categories.map((category) =>
        `• ${category.name}: ${category.totalInStock} units`,
      ).join('\n')}`
      : 'No inventory categories are available.';
  }

  if (/\b(products?|items?)\b/.test(query)) {
    const products = context.inventory.products;
    return products.length
      ? `Products in inventory:\n${products.slice(0, 20).map((product) =>
        `• ${product.name} (${product.category}): ${product.availableQuantity} units, ${currency(product.sellingPrice)} each`,
      ).join('\n')}${products.length > 20 ? `\nShowing 20 of ${products.length} products.` : ''}`
      : 'No product records are available.';
  }

  if (/\b(sales|revenue|orders|transactions|profit|earnings?)\b/.test(query)) {
    if (/\b(monthly|by month|month by month|history)\b/.test(query)) {
      const history = context.sales.monthlySales;
      return history.length
        ? `Recorded monthly sales (cancelled orders excluded):\n${history.map((month) =>
          `• ${month.month}: ${currency(month.revenue)} from ${month.orderCount} orders (${month.unitsSold.toLocaleString()} units)`,
        ).join('\n')}`
        : 'No dated sales history is available.';
    }
    const latestMonth = context.sales.monthlySales[context.sales.monthlySales.length - 1];
    return `Sales summary: ${context.sales.totalOrders.toLocaleString()} non-cancelled orders and ${currency(context.sales.totalRevenue)} recorded order revenue across ${context.sales.totalUnitsSold.toLocaleString()} itemized units. ${
      context.sales.costedUnits > 0
        ? `Estimated gross profit before expenses is ${currency(context.sales.estimatedGrossProfit)} on ${context.sales.costedUnits.toLocaleString()} units with known cost. `
        : 'No cost data is available to estimate gross profit. '
    }${
      latestMonth
        ? `The latest recorded month (${latestMonth.month}) has ${currency(latestMonth.revenue)} revenue from ${latestMonth.orderCount} orders.`
        : 'No dated sales history is available.'
    }`;
  }

  if (/\b(expenses?|budgets?|spending|spent|disbursements?)\b/.test(query)) {
    const accounts = [...context.finance.accounts]
      .sort((left, right) => right.actualAmount - left.actualAmount)
      .slice(0, 5);
    return `Recorded expenses total ${currency(context.finance.totalRecordedExpenses)}. ${
      accounts.length
        ? `Highest spending accounts:\n${accounts.map((account, index) =>
          `${index + 1}. ${account.name}: ${currency(account.actualAmount)} all time${account.monthlyBudget > 0 ? `; ${currency(account.currentMonthAmount)} this month / ${currency(account.monthlyBudget)} budget (${account.overBudget ? 'over budget' : 'within budget'})` : ''}`,
        ).join('\n')}`
        : 'No expense records are available.'
    }`;
  }

  if (/\b(low stock|out of stock|restock|reorder)\b/.test(query)) {
    return context.inventory.lowStockProducts.length
      ? `Products at or below the ${context.inventory.lowStockThreshold}-unit low-stock threshold:\n${context.inventory.lowStockProducts
        .slice(0, 10)
        .map((product) => `• ${product.name} (${product.category}): ${product.stock} units`)
        .join('\n')}`
      : `No products are at or below the ${context.inventory.lowStockThreshold}-unit low-stock threshold.`;
  }

  return `Store data summary: ${context.coverage.products} products, ${context.inventory.totalStockUnits.toLocaleString()} units in stock, ${context.sales.totalOrders} non-cancelled orders, ${currency(context.sales.totalRevenue)} recorded order revenue, ${currency(context.finance.totalRecordedExpenses)} in expenses, and ${context.coverage.itemStatusLogs} item-status records. Ask me about sales, top categories, next-month forecasts, inventory, suppliers, expenses, transactions, or item status.`;
}
