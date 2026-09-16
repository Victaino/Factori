import { 
  Plant, Operator, Material, Product, InventoryItem, Customer, Supplier, 
  Tax, Role, User, OrganizationSettings, Bank, Employee
} from '../types';

export const INITIAL_ROLES: Record<string, Role> = {
  "admin": {
    id: "admin",
    name: "admin",
    description: "System Administrator",
    permissions: [
      "DASHBOARD", "PRODUCTION", "INVENTORY", "MATERIALS", "PRODUCTS", "ASSETS", 
      "PROCUREMENT_GROUP", "SUPPLIERS", "PURCHASE_ORDERS", "EXPENSES", 
      "SALES_BILLING_GROUP", "SALES", "SALES_ORDERS", "INVOICES", "CUSTOMERS", 
      "FINANCE_GROUP", "BANKS", "TAXES", "PROFIT_LOSS", 
      "HR_GROUP", "EMPLOYEES", "PERFORMANCE_REVIEWS", "ADJUSTMENTS", "PAYROLL", "ATTENDANCE", 
      "RESOURCES", "INCIDENTS", 
      "SETTINGS_GROUP", "SETTINGS", "USERS", "ROLES", "DEDUCTIONS"
    ]
  },
  "user": {
    id: "user",
    name: "user",
    description: "Factory Production & Sales Operator",
    permissions: [
      "PRODUCTS", "MATERIALS", "DASHBOARD", "PRODUCTION", "INVENTORY", 
      "PROCUREMENT_GROUP", "SUPPLIERS", "EXPENSES", "SALES_BILLING_GROUP", 
      "SALES", "PURCHASE_ORDERS", "SALES_ORDERS", "INVOICES", "CUSTOMERS", 
      "FINANCE_GROUP", "HR_GROUP", "PROFIT_LOSS", "TAXES", "BANKS", 
      "EMPLOYEES", "ATTENDANCE", "PERFORMANCE_REVIEWS", "ADJUSTMENTS", "PAYROLL"
    ]
  }
};

export const INITIAL_USERS: Record<string, User & { password?: string }> = {
  "admin": {
    id: "admin-user",
    username: "admin",
    email: "admin@factori.ng",
    name: "System Administrator",
    role: "admin",
    password: "123admin456",
    lastLogin: new Date().toISOString()
  },
  "loveday": {
    id: "loveday-user",
    username: "Loveday",
    email: "loveday@factori.ng",
    name: "Loveday Factory Mgr",
    role: "user",
    password: "123456",
    lastLogin: new Date().toISOString()
  }
};

export const INITIAL_ORG_SETTINGS: OrganizationSettings = {
  id: "org-default",
  companyName: "Factori Industrial",
  companyAddress: "10 Industrial Way, Lagos, Nigeria",
  companyTin: "12345678-0001",
  companyLogo: "",
  taxName: "VAT",
  taxRate: 7.5,
  baseCurrency: "₦",
  defaultTheme: "light",
  defaultColorTheme: "blue",
  dashboardConfig: {
    showProductionOutput: true,
    showInventoryValue: true,
    showLowStockAlert: true,
    showIncidents: true,
    showTotalSales: true,
    showPurchases: true,
    showPayrollCost: true,
    showNetProfit: true
  }
};

export const INITIAL_PLANTS: Plant[] = [
  { id: "plant-1", name: "Main Processing Unit A" },
  { id: "plant-2", name: "Assembly Line Unit B" }
];

export const INITIAL_OPERATORS: Operator[] = [
  { id: "op-1", name: "Tunde Bakare" },
  { id: "op-2", name: "Emeka Obi" },
  { id: "op-3", name: "Amina Yusuf" }
];

export const INITIAL_MATERIALS: Material[] = [
  { id: "mat-1", name: "High-Density Polymer Resin", price: 45000, quantity: 120, amount: 5400000, trackInventory: true },
  { id: "mat-2", name: "Industrial Steel Coil (Grade 304)", price: 85000, quantity: 45, amount: 3825000, trackInventory: true },
  { id: "mat-3", name: "Corrugated Export Packaging", price: 3500, quantity: 600, amount: 2100000, trackInventory: true }
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: "prod-1", name: "Industrial Storage Drum 200L", price: 65000, quantity: 150, amount: 9750000, trackInventory: true },
  { id: "prod-2", name: "Heavy-Duty Pallet Crate", price: 28000, quantity: 320, amount: 8960000, trackInventory: true }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: "inv-1", productId: "prod-1", quantity: 150, price: 65000, lowStockThreshold: 25 },
  { id: "inv-2", productId: "prod-2", quantity: 320, price: 28000, lowStockThreshold: 50 }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: "cust-1", name: "Apex Logistics Nigeria Ltd", address: "Plot 14 Wharf Rd, Apapa, Lagos", phone: "+234 802 345 6789", email: "procurement@apexlogistics.ng", contactPerson: "Engr. David Adeleke" },
  { id: "cust-2", name: "Prime Agro Allied Industries", address: "KM 12 Ibadan Express, Sagamu", phone: "+234 803 987 6543", email: "supply@primeagro.com", contactPerson: "Hajiya Fatima Bello" }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: "sup-1", name: "Global Petrochemicals Ltd", address: "Trans-Amadi Industrial Layout, Port Harcourt", phone: "+234 805 111 2233", email: "sales@globalpetro.com", contactPerson: "Chief Victor Nwosu" },
  { id: "sup-2", name: "Federal Steel Mill Syndicate", address: "Industrial Zone, Ajaokuta", phone: "+234 807 444 5566", email: "orders@fedsteel.ng", contactPerson: "Ibrahim Sani" }
];

export const INITIAL_TAXES: Tax[] = [
  { id: "tax-1", name: "VAT (Value Added Tax)", rate: 7.5, description: "Standard Nigerian Federal Value Added Tax" },
  { id: "tax-2", name: "Withholding Tax (WHT)", rate: 5.0, description: "Standard Vendor Withholding Tax" }
];

export const INITIAL_BANKS: Bank[] = [
  { id: "bank-1", name: "Zenith Bank PLC", sortCode: "057150013" },
  { id: "bank-2", name: "Access Bank Nigeria", sortCode: "044150012" }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "emp-1",
    name: "Tunde Bakare",
    position: "Senior Plant Supervisor",
    photo: "",
    phone: "+234 803 123 4567",
    email: "tunde.b@factori.ng",
    salary: 350000,
    dateEmployed: "2023-01-15",
    bankId: "bank-1",
    bankAccountNo: "2018899012"
  },
  {
    id: "emp-2",
    name: "Emeka Obi",
    position: "Lead Quality Assurance Tech",
    photo: "",
    phone: "+234 802 765 4321",
    email: "emeka.o@factori.ng",
    salary: 280000,
    dateEmployed: "2023-04-01",
    bankId: "bank-2",
    bankAccountNo: "0109988776"
  }
];

export function getFullSeedDatabase(): Record<string, Record<string, any>> {
  const toRecord = (list: any[]) => {
    const rec: Record<string, any> = {};
    list.forEach(item => {
      if (item && item.id) rec[item.id] = item;
    });
    return rec;
  };

  return {
    plants: toRecord(INITIAL_PLANTS),
    operators: toRecord(INITIAL_OPERATORS),
    materials: toRecord(INITIAL_MATERIALS),
    products: toRecord(INITIAL_PRODUCTS),
    inventory: toRecord(INITIAL_INVENTORY),
    assets: {},
    production: {},
    incidents: {},
    customers: toRecord(INITIAL_CUSTOMERS),
    suppliers: toRecord(INITIAL_SUPPLIERS),
    taxes: toRecord(INITIAL_TAXES),
    purchase_orders: {},
    sales_orders: {},
    expenses: {},
    sales: {},
    banks: toRecord(INITIAL_BANKS),
    employees: toRecord(INITIAL_EMPLOYEES),
    attendance: {},
    performance_reviews: {},
    adjustments: {},
    deductions: {},
    payroll: {},
    roles: { ...INITIAL_ROLES },
    app_users: { ...INITIAL_USERS },
    organization_settings: { [INITIAL_ORG_SETTINGS.id]: INITIAL_ORG_SETTINGS }
  };
}
