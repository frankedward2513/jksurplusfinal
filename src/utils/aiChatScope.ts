const INVENTORY_TOPIC =
  /\b(?:inventor(?:y|ies)|products?|items?|stocks?|bales?|categor(?:y|ies)|suppliers?|barcodes?|restock(?:ing)?|reorder(?:ing)?|apparel|clothes|clothing|shirts?|pants|jeans|jackets?|shoes|caps|hoodies|dresses|sweaters)\b/i;

const EXPENSE_TOPIC =
  /\b(?:expenses?|disbursements?|budgets?|spending|spent|operating expenses?|operational expenses?|expense accounts?|utility bills?|utilities|rent|electricity bills?|water bills?|payroll|wages?|salaries)\b/i;

const SALES_TOPIC =
  /\b(?:sales?|sold|selling|best.?sell(?:ing)?|orders?|transactions?|revenue|income|profit|earnings?|forecast(?:s|ed|ing)?|predict(?:s|ed|ion)?|turnover|customers?)\b/i;

export const isStoreBusinessQuestion = (text: string): boolean =>
  INVENTORY_TOPIC.test(text) || EXPENSE_TOPIC.test(text) || SALES_TOPIC.test(text);

export const OUT_OF_SCOPE_REPLY =
  "I can only answer questions about this shop's inventory, sales, orders, categories, suppliers, expenses, transactions, forecasts, and stock status.";
