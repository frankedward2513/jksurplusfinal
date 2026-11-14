# EXINS Domain Class Diagram

The diagram shows the main business records, their key attributes, and the operations associated with them. Operations are design responsibilities; the TypeScript models themselves are data interfaces.

```mermaid
classDiagram
  direction TB

  class UserRole {
    <<enumeration>>
    owner
    staff
    customer
    guest
  }

  class AuthProvider {
    <<enumeration>>
    email
    google
  }

  class BaleStatus {
    <<enumeration>>
    sealed
    opened
    depleted
  }

  class OrderStatus {
    <<enumeration>>
    pending
    preparing
    dropped_to_courier
    completed
    cancelled
  }

  class PaymentMethod {
    <<enumeration>>
    cash
    gcash
    bank_transfer
    card
  }

  class TransactionFlow {
    <<enumeration>>
    inflow
    outflow
  }

  class ItemStatusType {
    <<enumeration>>
    sold
    returned
    damaged
    lost
  }

  class ItemResolutionStatus {
    <<enumeration>>
    lost
    found
    resolved
  }

  class UserProfile {
    +string uid
    +string email
    +string displayName
    +UserRole role
    +string phone
    +string address
    +AuthProvider provider
    +string createdAt
    +login(email, password) boolean
    +register(name, email, password) boolean
    +loginWithGoogle() result
    +completeGoogleSignUp() boolean
    +logout() void
  }

  class CustomerSummary {
    +string id
    +string customerName
    +number totalPurchase
  }

  class Supplier {
    +string id
    +string name
    +string contactPerson
    +string email
    +string phone
    +string address
    +string description
    +number totalBalesSourced
    +addSupplier() void
    +updateSupplier() void
    +deleteSupplier() void
  }

  class Bale {
    +string id
    +string baleCode
    +string baleName
    +string category
    +string supplierId
    +string supplierName
    +number totalPurchasePrice
    +number quantityPurchase
    +number pricePerPiece
    +BaleStatus status
    +number totalSalesMade
    +addBale() void
    +updateBale() void
    +deleteBale() void
  }

  class Category {
    +string id
    +string name
    +string description
    +string color
    +number totalInStock
    +addCategory() void
    +updateCategory() void
    +deleteCategory() void
  }

  class Product {
    +string id
    +string name
    +string category
    +string baleCode
    +string baleName
    +number availableQuantity
    +number sellingPrice
    +number costPrice
    +string size
    +string imageUrl
    +string productLink
    +string description
    +string barcode
    +addProduct() void
    +updateProduct() void
    +deleteProduct() void
  }

  class Order {
    +string id
    +string orderNumber
    +string customerName
    +number totalAmount
    +OrderStatus status
    +number discount
    +number amountTendered
    +number changeAmount
    +PaymentMethod paymentMethod
    +string createdAt
    +string updatedAt
    +completeSale() Order
  }

  class OrderItem {
    +string productId
    +string name
    +string category
    +string size
    +number price
    +number costPrice
    +number quantity
    +string imageUrl
    +string baleCode
  }

  class ExpenseAccount {
    +string id
    +string name
    +number monthlyBudget
    +string description
    +number totalSpent
    +string color
    +addExpenseAccount() void
    +updateExpenseAccount() void
    +deleteExpenseAccount() void
  }

  class Expense {
    +string id
    +string accountId
    +string accountName
    +number amount
    +string date
    +PaymentMethod paymentMethod
    +string receiptUrl
    +string description
    +addExpense() void
    +deleteExpense() void
  }

  class Transaction {
    +string id
    +string date
    +TransactionFlow flowType
    +string category
    +string account
    +string description
    +PaymentMethod paymentMethod
    +number inflow
    +number outflow
    +string orderId
    +string expenseId
    +addTransaction() void
    +deleteTransaction() void
  }

  class ItemStatusLog {
    +string id
    +string productId
    +string productName
    +ItemStatusType type
    +number quantity
    +string date
    +string notes
    +ItemResolutionStatus status
    +number foundQuantity
    +string foundDate
    +string foundNotes
    +logStatus() void
    +updateStatus() void
    +deleteStatusLog() void
  }

  class TrashItem {
    +string id
    +string tableName
    +string recordId
    +JSON recordData
    +string deletedAt
    +string expiresAt
    +restore() void
  }

  UserProfile ..> UserRole : role
  Supplier "1" --> "0..*" Bale : supplies
  Bale "0..1" --> "0..*" Product : source bale
  Category "1" --> "0..*" Product : classifies
  Order "1" *-- "1..*" OrderItem : contains
  OrderItem "0..*" ..> "0..1" Product : product reference
  ExpenseAccount "1" --> "0..*" Expense : records
  Order "0..1" <-- "0..*" Transaction : order reference
  Expense "0..1" <-- "0..*" Transaction : expense reference
  Product "0..1" <-- "0..*" ItemStatusLog : status history
  Order ..> CustomerSummary : updates by customer name
  TrashItem ..> Product : may store deleted record
  TrashItem ..> Order : may store deleted record
  TrashItem ..> Expense : may store deleted record
```

Dashed relationships indicate application-level references; the database schema does not enforce foreign keys. User roles are values of `UserRole`, not separate user subclasses.
