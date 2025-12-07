
export interface Plant {
  id: string;
  name: string;
}

export interface Operator {
  id: string;
  name: string;
}

export interface Material {
  id: string;
  name: string;
  price: number;
  quantity: number;
  amount: number; // Derived: price * quantity
  trackInventory?: boolean;
}

export interface Product {
  id:string;
  name: string;
  price: number;
  quantity: number;
  amount: number; // Derived: price * quantity
  imageUrl?: string; // New field for product image
  trackInventory?: boolean;
}

export interface InventoryItem {
  id: string;
  productId: string; // FK to Product
  quantity: number;
  price: number;
  lowStockThreshold?: number; // Alert trigger
}

export interface Production {
  id: string;
  date: string; // ISO Date string
  productId: string; // FK
  plantId: string; // FK
  operatorId: string; // FK
  materialsUsed: { materialId: string; inputTonnage: number }[]; // Replaces materialId and inputTonnage
  outputTonnage: number;
  outputUnit?: string; // e.g., Tons, Kg, Litres
  timeStart: string; // HH:mm
  timeStop: string; // HH:mm
  duration: number; // Minutes or Hours (derived)
  notes?: string; // Additional details
}

export interface IncidentReport {
  id: string;
  productionId: string; // FK
  description: string;
  remark: string;
  date: string; // Added for easier sorting/display
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  contactPerson: string;
}

export interface Supplier {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  contactPerson: string;
}

export interface Tax {
  id: string;
  name: string; // e.g. VAT, GST
  rate: number; // Percentage e.g. 7.5
  description?: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string; // FK
  orderDate: string;
  expectedDeliveryDate: string;
  receivedDate?: string; // Optional field
  taxRate?: number;
  taxAmount?: number;
  totalAmount: number; // Final amount including tax
  status: 'Pending' | 'Received' | 'Cancelled';
}

export interface SalesOrder {
  id: string;
  customerId: string; // FK
  productId: string; // FK
  quantity: number;
  unitPrice: number;
  orderDate: string;
  deliveryDate: string;
  receivedDate?: string; // Optional field
  taxRate?: number;
  taxAmount?: number;
  totalAmount: number; // Final amount including tax
  status: 'Pending' | 'Received' | 'Confirmed' | 'Shipped' | 'Cancelled';
}

export interface Expense {
  id: string;
  supplierId: string; // FK
  items: string;
  quantity: number;
  price: number;
  taxRate?: number;
  taxAmount?: number;
  amount: number; // Total amount including tax
  paid: number;
  balance: number;
  date: string;
}

export interface Sale {
  id: string;
  customerId: string; // FK
  productId: string; // FK
  quantity: number;
  price: number;
  taxRate?: number;
  taxAmount?: number;
  amount: number; // Total amount including tax
  paid: number;
  balance: number;
  date: string;
}

// --- HR & Payroll Types ---

export interface Bank {
  id: string;
  name: string;
  sortCode: string;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  photo: string; // URL or base64 placeholder
  phone: string;
  email: string;
  salary: number;
  bankAccountNo: string;
  bankId: string; // FK
  dateEmployed: string;
  dateDisengaged?: string;
  lastPlaceOfEmployment?: string;
  guarantorName?: string;
  guarantorPhone?: string;
}

export interface Deduction {
  id: string;
  description: string;
  amount: number;
}

export interface Payroll {
  id: string;
  employeeId: string; // FK
  deductionId: string; // FK
  amountPayable: number;
  date: string; // Payment date
}

// --- Auth Types ---

export type UserRole = string; // Dynamic roles now

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // Array of ViewStates
}

export interface User {
  id: string;
  username: string;
  password?: string; // Only used for updates, not exposed usually
  name: string;
  role: UserRole;
  lastLogin?: string;
}

// --- Global Settings ---

export interface DashboardConfig {
  showProductionOutput: boolean;
  showInventoryValue: boolean;
  showLowStockAlert: boolean;
  showIncidents: boolean;
  showTotalSales: boolean;
  showPurchases: boolean;
  showPayrollCost: boolean;
  showNetProfit: boolean;
}

export interface OrganizationSettings {
  id: string;
  companyName: string;
  companyAddress: string;
  companyTin: string;
  companyLogo: string;
  taxName: string; // e.g. VAT
  taxRate: number; // e.g. 7.5
  baseCurrency: string;
  defaultTheme: string;
  defaultColorTheme: string;
  dashboardConfig?: DashboardConfig;
}

// Navigation Types
export type ViewState = 
  | 'DASHBOARD' 
  | 'PRODUCTION' 
  | 'INVENTORY' 
  | 'MATERIALS' 
  | 'PRODUCTS' 
  | 'INCIDENTS' 
  | 'RESOURCES'
  | 'CUSTOMERS'
  | 'SUPPLIERS'
  | 'PURCHASE_ORDERS'
  | 'SALES_ORDERS'
  | 'EXPENSES'
  | 'SALES'
  | 'INVOICES'
  | 'EMPLOYEES'
  | 'BANKS'
  | 'TAXES'
  | 'PAYROLL'
  | 'DEDUCTIONS'
  | 'PROFIT_LOSS'
  | 'SETTINGS'
  | 'USERS'
  | 'ROLES'; // New view for role management
