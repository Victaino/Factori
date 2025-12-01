
import { 
  Plant, Operator, Material, Product, InventoryItem, Production, IncidentReport, Customer, Supplier, Expense, Sale,
  Bank, Employee, Deduction, Payroll, PurchaseOrder, SalesOrder
} from '../types';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Initial Seed Data
const SEED_PLANTS: Plant[] = [
  { id: 'p1', name: 'Plant Alpha' },
  { id: 'p2', name: 'Plant Beta' },
  { id: 'p3', name: 'Refinery X' }
];

const SEED_OPERATORS: Operator[] = [
  { id: 'o1', name: 'John Doe' },
  { id: 'o2', name: 'Jane Smith' },
  { id: 'o3', name: 'Mike Ross' }
];

const SEED_MATERIALS: Material[] = [
  { id: 'm1', name: 'Raw Iron', price: 120, quantity: 500, amount: 60000 },
  { id: 'm2', name: 'Carbon mix', price: 45, quantity: 200, amount: 9000 },
  { id: 'm3', name: 'Coolant', price: 15, quantity: 1000, amount: 15000 }
];

const SEED_PRODUCTS: Product[] = [
  { id: 'pr1', name: 'Steel Beams', price: 500, quantity: 100, amount: 50000 },
  { id: 'pr2', name: 'Sheet Metal', price: 350, quantity: 250, amount: 87500 }
];

const SEED_INVENTORY: InventoryItem[] = [
  { id: 'inv1', productId: 'pr1', quantity: 50, price: 500, lowStockThreshold: 20 },
  { id: 'inv2', productId: 'pr2', quantity: 120, price: 350, lowStockThreshold: 150 }
];

const SEED_PRODUCTION: Production[] = [
  { 
    id: 'prod1', date: '2023-10-25', productId: 'pr1', plantId: 'p1', 
    operatorId: 'o1', materialId: 'm1', inputTonnage: 10, outputTonnage: 9.5, 
    timeStart: '08:00', timeStop: '16:00', duration: 8, notes: 'Standard run, optimal output.' 
  },
  { 
    id: 'prod2', date: '2023-10-26', productId: 'pr2', plantId: 'p2', 
    operatorId: 'o2', materialId: 'm2', inputTonnage: 5, outputTonnage: 4.8, 
    timeStart: '09:00', timeStop: '14:00', duration: 5, notes: 'Slight delay during startup.' 
  }
];

const SEED_INCIDENTS: IncidentReport[] = [
  { id: 'inc1', productionId: 'prod1', description: 'Minor overheating', remark: 'Resolved by cooling cycle', date: '2023-10-25' }
];

const SEED_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Acme Corp', address: '123 Industrial Way', phone: '555-0100', email: 'contact@acme.com', contactPerson: 'Alice Manager' },
  { id: 'c2', name: 'Globex Inc', address: '456 Global Blvd', phone: '555-0200', email: 'info@globex.com', contactPerson: 'Bob Director' }
];

const SEED_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'Raw Materials Co', address: '789 Mine Rd', phone: '555-0900', email: 'sales@rawmat.com', contactPerson: 'Dave Miner' },
  { id: 's2', name: 'ChemTech', address: '101 Lab St', phone: '555-0800', email: 'supply@chemtech.com', contactPerson: 'Sarah Chemist' }
];

const SEED_PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: 'po1', supplierId: 's1', orderDate: '2023-11-01', expectedDeliveryDate: '2023-11-10', totalAmount: 5000, status: 'Pending' }
];

const SEED_SALES_ORDERS: SalesOrder[] = [
  { 
    id: 'so1', customerId: 'c1', productId: 'pr1', quantity: 15, unitPrice: 500, 
    orderDate: '2023-11-05', deliveryDate: '2023-11-15', totalAmount: 7500, status: 'Confirmed' 
  }
];

const SEED_EXPENSES: Expense[] = [
  { id: 'ex1', supplierId: 's1', items: 'Iron Ore Delivery', quantity: 10, price: 100, amount: 1000, paid: 500, balance: 500, date: '2023-10-27' }
];

const SEED_SALES: Sale[] = [
  { id: 'sl1', customerId: 'c1', productId: 'pr1', quantity: 5, price: 600, amount: 3000, paid: 3000, balance: 0, date: '2023-10-28' }
];

const SEED_BANKS: Bank[] = [
  { id: 'b1', name: 'Global Bank', sortCode: '01-02-03' },
  { id: 'b2', name: 'City Finance', sortCode: '99-88-77' }
];

const SEED_DEDUCTIONS: Deduction[] = [
  { id: 'd1', description: 'Tax', amount: 200 },
  { id: 'd2', description: 'Health Insurance', amount: 50 }
];

const SEED_EMPLOYEES: Employee[] = [
  { 
    id: 'e1', name: 'Sarah Connor', position: 'Manager', photo: '', phone: '555-1234', 
    email: 'sarah@factori.com', salary: 5000, bankAccountNo: '12345678', bankId: 'b1', 
    dateEmployed: '2022-01-15'
  },
  { 
    id: 'e2', name: 'Kyle Reese', position: 'Supervisor', photo: '', phone: '555-5678', 
    email: 'kyle@factori.com', salary: 3500, bankAccountNo: '87654321', bankId: 'b2', 
    dateEmployed: '2022-03-10'
  }
];

const SEED_PAYROLL: Payroll[] = [
  { id: 'pay1', employeeId: 'e1', deductionId: 'd1', amountPayable: 4800, date: '2023-10-31' }
];

class DatabaseService {
  private getStorage<T>(key: string, seed: T[]): T[] {
    try {
      const stored = localStorage.getItem(`factori_${key}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn(`Failed to parse storage for ${key}, resetting to seed.`, e);
      localStorage.removeItem(`factori_${key}`);
    }
    localStorage.setItem(`factori_${key}`, JSON.stringify(seed));
    return seed;
  }

  private setStorage<T>(key: string, data: T[]) {
    try {
      localStorage.setItem(`factori_${key}`, JSON.stringify(data));
    } catch (e) {
      console.error(`Failed to save storage for ${key}`, e);
    }
  }

  // --- Plants ---
  getPlants(): Plant[] { return this.getStorage('plants', SEED_PLANTS); }
  addPlant(name: string): Plant {
    const items = this.getPlants();
    const newItem = { id: generateId(), name };
    this.setStorage('plants', [...items, newItem]);
    return newItem;
  }
  updatePlant(id: string, name: string) {
    const items = this.getPlants();
    const updated = items.map(i => i.id === id ? { ...i, name } : i);
    this.setStorage('plants', updated);
  }
  deletePlant(id: string) { this.setStorage('plants', this.getPlants().filter(i => i.id !== id)); }

  // --- Operators ---
  getOperators(): Operator[] { return this.getStorage('operators', SEED_OPERATORS); }
  addOperator(name: string): Operator {
    const items = this.getOperators();
    const newItem = { id: generateId(), name };
    this.setStorage('operators', [...items, newItem]);
    return newItem;
  }
  updateOperator(id: string, name: string) {
    const items = this.getOperators();
    const updated = items.map(i => i.id === id ? { ...i, name } : i);
    this.setStorage('operators', updated);
  }
  deleteOperator(id: string) { this.setStorage('operators', this.getOperators().filter(i => i.id !== id)); }

  // --- Materials ---
  getMaterials(): Material[] { return this.getStorage('materials', SEED_MATERIALS); }
  addMaterial(data: Omit<Material, 'id' | 'amount'>): Material {
    const items = this.getMaterials();
    const newItem = { ...data, id: generateId(), amount: data.price * data.quantity };
    this.setStorage('materials', [...items, newItem]);
    return newItem;
  }
  updateMaterial(id: string, updates: Partial<Material>) {
    const items = this.getMaterials();
    const updated = items.map(i => {
        if (i.id === id) {
            const merged = { ...i, ...updates };
            merged.amount = merged.price * merged.quantity;
            return merged;
        }
        return i;
    });
    this.setStorage('materials', updated);
  }
  deleteMaterial(id: string) { this.setStorage('materials', this.getMaterials().filter(i => i.id !== id)); }

  // --- Products ---
  getProducts(): Product[] { return this.getStorage('products', SEED_PRODUCTS); }
  addProduct(data: Omit<Product, 'id' | 'amount'>): Product {
    const items = this.getProducts();
    const newItem = { ...data, id: generateId(), amount: data.price * data.quantity };
    this.setStorage('products', [...items, newItem]);
    return newItem;
  }
  updateProduct(id: string, updates: Partial<Product>) {
    const items = this.getProducts();
    const updated = items.map(i => {
        if (i.id === id) {
            const merged = { ...i, ...updates };
            merged.amount = merged.price * merged.quantity;
            return merged;
        }
        return i;
    });
    this.setStorage('products', updated);
  }
  deleteProduct(id: string) { this.setStorage('products', this.getProducts().filter(i => i.id !== id)); }

  // --- Inventory ---
  getInventory(): InventoryItem[] { return this.getStorage('inventory', SEED_INVENTORY); }
  addInventory(data: Omit<InventoryItem, 'id'>): InventoryItem {
    const items = this.getInventory();
    const newItem = { ...data, id: generateId() };
    this.setStorage('inventory', [...items, newItem]);
    return newItem;
  }
  updateInventory(id: string, updates: Partial<InventoryItem>) {
    const items = this.getInventory();
    const updated = items.map(i => i.id === id ? { ...i, ...updates } : i);
    this.setStorage('inventory', updated);
  }
  deleteInventory(id: string) { this.setStorage('inventory', this.getInventory().filter(i => i.id !== id)); }

  // --- Production ---
  getProduction(): Production[] { return this.getStorage('production', SEED_PRODUCTION); }
  addProduction(data: Omit<Production, 'id'>): Production {
    const items = this.getProduction();
    const newItem = { ...data, id: generateId() };
    this.setStorage('production', [newItem, ...items]); // Newest first
    return newItem;
  }
  updateProduction(id: string, updates: Partial<Production>) {
    const items = this.getProduction();
    const updated = items.map(i => i.id === id ? { ...i, ...updates } : i);
    this.setStorage('production', updated);
  }
  deleteProduction(id: string) { this.setStorage('production', this.getProduction().filter(i => i.id !== id)); }

  // --- Incidents ---
  getIncidents(): IncidentReport[] { return this.getStorage('incidents', SEED_INCIDENTS); }
  addIncident(data: Omit<IncidentReport, 'id'>): IncidentReport {
    const items = this.getIncidents();
    const newItem = { ...data, id: generateId() };
    this.setStorage('incidents', [newItem, ...items]);
    return newItem;
  }
  updateIncident(id: string, updates: Partial<IncidentReport>) {
    const items = this.getIncidents();
    const updated = items.map(i => i.id === id ? { ...i, ...updates } : i);
    this.setStorage('incidents', updated);
  }
  deleteIncident(id: string) { this.setStorage('incidents', this.getIncidents().filter(i => i.id !== id)); }

  // --- Customers ---
  getCustomers(): Customer[] { return this.getStorage('customers', SEED_CUSTOMERS); }
  addCustomer(data: Omit<Customer, 'id'>): Customer {
    const items = this.getCustomers();
    const newItem = { ...data, id: generateId() };
    this.setStorage('customers', [...items, newItem]);
    return newItem;
  }
  updateCustomer(id: string, updates: Partial<Customer>) {
    const items = this.getCustomers();
    const updated = items.map(c => c.id === id ? { ...c, ...updates } : c);
    this.setStorage('customers', updated);
  }
  deleteCustomer(id: string) { this.setStorage('customers', this.getCustomers().filter(i => i.id !== id)); }

  // --- Suppliers ---
  getSuppliers(): Supplier[] { return this.getStorage('suppliers', SEED_SUPPLIERS); }
  addSupplier(data: Omit<Supplier, 'id'>): Supplier {
    const items = this.getSuppliers();
    const newItem = { ...data, id: generateId() };
    this.setStorage('suppliers', [...items, newItem]);
    return newItem;
  }
  updateSupplier(id: string, updates: Partial<Supplier>) {
    const items = this.getSuppliers();
    const updated = items.map(s => s.id === id ? { ...s, ...updates } : s);
    this.setStorage('suppliers', updated);
  }
  deleteSupplier(id: string) { this.setStorage('suppliers', this.getSuppliers().filter(i => i.id !== id)); }

  // --- Purchase Orders ---
  getPurchaseOrders(): PurchaseOrder[] { return this.getStorage('purchaseOrders', SEED_PURCHASE_ORDERS); }
  addPurchaseOrder(data: Omit<PurchaseOrder, 'id'>): PurchaseOrder {
    const items = this.getPurchaseOrders();
    const newItem = { ...data, id: generateId() };
    this.setStorage('purchaseOrders', [newItem, ...items]);
    return newItem;
  }
  updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>) {
    const items = this.getPurchaseOrders();
    const updated = items.map(o => o.id === id ? { ...o, ...updates } : o);
    this.setStorage('purchaseOrders', updated);
  }
  deletePurchaseOrder(id: string) { this.setStorage('purchaseOrders', this.getPurchaseOrders().filter(i => i.id !== id)); }

  // --- Sales Orders ---
  getSalesOrders(): SalesOrder[] { return this.getStorage('salesOrders', SEED_SALES_ORDERS); }
  addSalesOrder(data: Omit<SalesOrder, 'id'>): SalesOrder {
    const items = this.getSalesOrders();
    const newItem = { ...data, id: generateId() };
    this.setStorage('salesOrders', [newItem, ...items]);
    return newItem;
  }
  updateSalesOrder(id: string, updates: Partial<SalesOrder>) {
    const items = this.getSalesOrders();
    const updated = items.map(o => o.id === id ? { ...o, ...updates } : o);
    this.setStorage('salesOrders', updated);
  }
  confirmSalesOrder(id: string) {
    const items = this.getSalesOrders();
    const order = items.find(o => o.id === id);
    if (order && order.status !== 'Confirmed') {
        // Create Sale Record
        const saleData: Sale = {
            id: generateId(),
            customerId: order.customerId,
            productId: order.productId,
            quantity: order.quantity,
            price: order.unitPrice,
            amount: order.totalAmount,
            paid: 0,
            balance: order.totalAmount,
            date: new Date().toISOString().split('T')[0]
        };
        const currentSales = this.getSales();
        this.setStorage('sales', [saleData, ...currentSales]);

        // Update Order Status
        this.updateSalesOrder(id, { status: 'Confirmed' });
    }
  }
  deleteSalesOrder(id: string) { this.setStorage('salesOrders', this.getSalesOrders().filter(i => i.id !== id)); }


  // --- Expenses (Purchases) ---
  getExpenses(): Expense[] { return this.getStorage('expenses', SEED_EXPENSES); }
  addExpense(data: Omit<Expense, 'id'>): Expense {
    const items = this.getExpenses();
    const newItem = { ...data, id: generateId() };
    this.setStorage('expenses', [newItem, ...items]);
    return newItem;
  }
  updateExpense(id: string, updates: Partial<Expense>) {
    const items = this.getExpenses();
    const updated = items.map(e => {
        if (e.id === id) {
            const merged = { ...e, ...updates };
            // Recalculate derived if quantity, price or paid changed
            if (updates.quantity !== undefined || updates.price !== undefined || updates.paid !== undefined) {
                merged.amount = merged.quantity * merged.price;
                merged.balance = merged.amount - merged.paid;
            }
            return merged;
        }
        return e;
    });
    this.setStorage('expenses', updated);
  }
  deleteExpense(id: string) { this.setStorage('expenses', this.getExpenses().filter(i => i.id !== id)); }

  // --- Sales ---
  getSales(): Sale[] { return this.getStorage('sales', SEED_SALES); }
  addSale(data: Omit<Sale, 'id'>): Sale {
    const items = this.getSales();
    const newItem = { ...data, id: generateId() };
    this.setStorage('sales', [newItem, ...items]);
    return newItem;
  }
  updateSale(id: string, updates: Partial<Sale>) {
    const items = this.getSales();
    const updated = items.map(s => {
        if (s.id === id) {
            const merged = { ...s, ...updates };
            // Recalculate derived if price changed
            if (updates.price !== undefined) {
                merged.amount = merged.quantity * merged.price;
                merged.balance = merged.amount - merged.paid;
            }
            return merged;
        }
        return s;
    });
    this.setStorage('sales', updated);
  }
  deleteSale(id: string) { this.setStorage('sales', this.getSales().filter(i => i.id !== id)); }

  // --- Banks ---
  getBanks(): Bank[] { return this.getStorage('banks', SEED_BANKS); }
  addBank(data: Omit<Bank, 'id'>): Bank {
    const items = this.getBanks();
    const newItem = { ...data, id: generateId() };
    this.setStorage('banks', [...items, newItem]);
    return newItem;
  }
  updateBank(id: string, updates: Partial<Bank>) {
    const items = this.getBanks();
    const updated = items.map(b => b.id === id ? { ...b, ...updates } : b);
    this.setStorage('banks', updated);
  }
  deleteBank(id: string) { this.setStorage('banks', this.getBanks().filter(i => i.id !== id)); }

  // --- Employees ---
  getEmployees(): Employee[] { return this.getStorage('employees', SEED_EMPLOYEES); }
  addEmployee(data: Omit<Employee, 'id'>): Employee {
    const items = this.getEmployees();
    const newItem = { ...data, id: generateId() };
    this.setStorage('employees', [...items, newItem]);
    return newItem;
  }
  updateEmployee(id: string, updates: Partial<Employee>) {
    const items = this.getEmployees();
    const updated = items.map(e => e.id === id ? { ...e, ...updates } : e);
    this.setStorage('employees', updated);
  }
  deleteEmployee(id: string) { this.setStorage('employees', this.getEmployees().filter(i => i.id !== id)); }

  // --- Deductions ---
  getDeductions(): Deduction[] { return this.getStorage('deductions', SEED_DEDUCTIONS); }
  addDeduction(data: Omit<Deduction, 'id'>): Deduction {
    const items = this.getDeductions();
    const newItem = { ...data, id: generateId() };
    this.setStorage('deductions', [...items, newItem]);
    return newItem;
  }
  updateDeduction(id: string, updates: Partial<Deduction>) {
    const items = this.getDeductions();
    const updated = items.map(d => d.id === id ? { ...d, ...updates } : d);
    this.setStorage('deductions', updated);
  }
  deleteDeduction(id: string) { this.setStorage('deductions', this.getDeductions().filter(i => i.id !== id)); }

  // --- Payroll ---
  getPayroll(): Payroll[] { return this.getStorage('payroll', SEED_PAYROLL); }
  addPayroll(data: Omit<Payroll, 'id'>): Payroll {
    const items = this.getPayroll();
    const newItem = { ...data, id: generateId() };
    this.setStorage('payroll', [newItem, ...items]);
    return newItem;
  }
  updatePayroll(id: string, updates: Partial<Payroll>) {
    const items = this.getPayroll();
    const updated = items.map(p => p.id === id ? { ...p, ...updates } : p);
    this.setStorage('payroll', updated);
  }
  deletePayroll(id: string) { this.setStorage('payroll', this.getPayroll().filter(i => i.id !== id)); }
}

export const db = new DatabaseService();
