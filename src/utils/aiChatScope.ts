const INVENTORY_TOPIC =
  /\b(?:inventor(?:y|ies)|products?|items?|stocks?|bales?|categor(?:y|ies)|suppliers?|barcodes?|restock(?:ing)?|reorder(?:ing)?|apparel|clothes|clothing|shirts?|pants|jeans|jackets?|shoes|caps|hoodies|dresses|sweaters)\b/i;

const EXPENSE_TOPIC =
  /\b(?:expenses?|disbursements?|budgets?|spending|spent|operating expenses?|operational expenses?|expense accounts?|utility bills?|utilities|rent|electricity bills?|water bills?|payroll|wages?|salaries)\b/i;

export const isInventoryOrExpenseQuestion = (text: string): boolean =>
  INVENTORY_TOPIC.test(text) || EXPENSE_TOPIC.test(text);

export const OUT_OF_SCOPE_REPLY =
  "I can only answer questions about this shop's inventory and expenses. Ask about products, stock, categories, bales, suppliers, expense records, or budgets.";
