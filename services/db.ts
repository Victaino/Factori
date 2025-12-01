
import { supabase } from './supabase';
import { 
  Plant, Operator, Material, Product, InventoryItem, Production, IncidentReport, Customer, Supplier, Expense, Sale,
  Bank, Employee, Deduction, Payroll, PurchaseOrder, SalesOrder
} from '../types';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

class DatabaseService {
  
  private async fetchTable<T>(table: string): Promise<T[]> {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error fetching ${table}:`, error);
      return [];
    }
    return data as T[];
  }

  private async insert<T>(table: string, row: T): Promise<T | null> {
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) {
      console.error(`Error inserting into ${table}:`, error);
      return null;
    }
    return data as T;
  }

  private async update<T>(table: string, id: string, updates: Partial<T>): Promise<void> {
    const { error } = await supabase.from(table).update(updates).eq('id', id);
    if (error) console.error(`Error updating ${table}:`, error);
  }

  private async delete(table: string, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) console.error(`Error deleting from ${table}:`, error);
  }

  // --- Plants ---
  async getPlants(): Promise<Plant[]> { return this.fetchTable('plants'); }
  async addPlant(name: string): Promise<Plant> {
    return (await this.insert('plants', { id: generateId(), name }))!;
  }
  async updatePlant(id: string, name: string) { await this.update('plants', id, { name }); }
  async deletePlant(id: string) { await this.delete('plants', id); }

  // --- Operators ---
  async getOperators(): Promise<Operator[]> { return this.fetchTable('operators'); }
  async addOperator(name: string): Promise<Operator> {
    return (await this.insert('operators', { id: generateId(), name }))!;
  }
  async updateOperator(id: string, name: string) { await this.update('operators', id, { name }); }
  async deleteOperator(id: string) { await this.delete('operators', id); }

  // --- Materials ---
  async getMaterials(): Promise<Material[]> { return this.fetchTable('materials'); }
  async addMaterial(data: Omit<Material, 'id' | 'amount'>): Promise<Material> {
    const newItem = { ...data, id: generateId(), amount: data.price * data.quantity };
    return (await this.insert('materials', newItem))!;
  }
  async updateMaterial(id: string, updates: Partial<Material>) {
    // Note: complex logic for amount updates should optimally be handled, keeping it simple for async conversion
    // Ideally we fetch, merge, calculate amount, then push. 
    // For now assuming the UI passes the correct derived data or we rely on basic updates.
    const { price, quantity } = updates;
    let amount = updates.amount;
    if (price !== undefined && quantity !== undefined) amount = price * quantity;
    
    await this.update('materials', id, { ...updates, amount });
  }
  async deleteMaterial(id: string) { await this.delete('materials', id); }

  // --- Products ---
  async getProducts(): Promise<Product[]> { return this.fetchTable('products'); }
  async addProduct(data: Omit<Product, 'id' | 'amount'>): Promise<Product> {
    const newItem = { ...data, id: generateId(), amount: data.price * data.quantity };
    const product = (await this.insert('products', newItem))!;
    
    // AUTOMATION: Create corresponding inventory record when a product is defined
    if(product) {
        await this.insert('inventory', {
            id: generateId(),
            productId: product.id,
            quantity: product.quantity, // Initial stock from definition
            price: product.price,
            lowStockThreshold: 10 // Default threshold
        });
    }
    return product;
  }
  async updateProduct(id: string, updates: Partial<Product>) {
     // Similar simplification for async update
     await this.update('products', id, updates);
  }
  async deleteProduct(id: string) { 
      await this.delete('products', id); 
      // Ideally delete from inventory too, or cascade via DB
  }

  // --- Inventory ---
  async getInventory(): Promise<InventoryItem[]> { return this.fetchTable('inventory'); }
  async addInventory(data: Omit<InventoryItem, 'id'>): Promise<InventoryItem> {
    return (await this.insert('inventory', { ...data, id: generateId() }))!;
  }
  async updateInventory(id: string, updates: Partial<InventoryItem>) { await this.update('inventory', id, updates); }
  async deleteInventory(id: string) { await this.delete('inventory', id); }

  // --- Production ---
  async getProduction(): Promise<Production[]> { return this.fetchTable('production'); }
  async addProduction(data: Omit<Production, 'id'>): Promise<Production> {
    const production = (await this.insert('production', { ...data, id: generateId() }))!;
    
    // AUTOMATION: Update Stocks
    if (production) {
        // 1. Consume Material (Reduce Stock)
        const materials = await this.getMaterials();
        const material = materials.find(m => m.id === data.materialId);
        if (material) {
            const newQty = Math.max(0, material.quantity - data.inputTonnage);
            await this.updateMaterial(material.id, { quantity: newQty });
        }

        // 2. Increase Inventory Product (Add Stock)
        const inventory = await this.getInventory();
        const invItem = inventory.find(i => i.productId === data.productId);
        if (invItem) {
            await this.updateInventory(invItem.id, { quantity: invItem.quantity + data.outputTonnage });
        } else {
             // Fallback: If inventory item missing for some reason
             await this.insert('inventory', {
                id: generateId(),
                productId: data.productId,
                quantity: data.outputTonnage,
                price: 0, 
                lowStockThreshold: 10
            });
        }
    }
    return production;
  }
  async updateProduction(id: string, updates: Partial<Production>) { await this.update('production', id, updates); }
  async deleteProduction(id: string) { await this.delete('production', id); }

  // --- Incidents ---
  async getIncidents(): Promise<IncidentReport[]> { return this.fetchTable('incidents'); }
  async addIncident(data: Omit<IncidentReport, 'id'>): Promise<IncidentReport> {
    return (await this.insert('incidents', { ...data, id: generateId() }))!;
  }
  async updateIncident(id: string, updates: Partial<IncidentReport>) { await this.update('incidents', id, updates); }
  async deleteIncident(id: string) { await this.delete('incidents', id); }

  // --- Customers ---
  async getCustomers(): Promise<Customer[]> { return this.fetchTable('customers'); }
  async addCustomer(data: Omit<Customer, 'id'>): Promise<Customer> {
    return (await this.insert('customers', { ...data, id: generateId() }))!;
  }
  async updateCustomer(id: string, updates: Partial<Customer>) { await this.update('customers', id, updates); }
  async deleteCustomer(id: string) { await this.delete('customers', id); }

  // --- Suppliers ---
  async getSuppliers(): Promise<Supplier[]> { return this.fetchTable('suppliers'); }
  async addSupplier(data: Omit<Supplier, 'id'>): Promise<Supplier> {
    return (await this.insert('suppliers', { ...data, id: generateId() }))!;
  }
  async updateSupplier(id: string, updates: Partial<Supplier>) { await this.update('suppliers', id, updates); }
  async deleteSupplier(id: string) { await this.delete('suppliers', id); }

  // --- Purchase Orders ---
  async getPurchaseOrders(): Promise<PurchaseOrder[]> { return this.fetchTable('purchase_orders'); }
  async addPurchaseOrder(data: Omit<PurchaseOrder, 'id'>): Promise<PurchaseOrder> {
    return (await this.insert('purchase_orders', { ...data, id: generateId() }))!;
  }
  async updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>) { await this.update('purchase_orders', id, updates); }
  async deletePurchaseOrder(id: string) { await this.delete('purchase_orders', id); }

  // --- Sales Orders ---
  async getSalesOrders(): Promise<SalesOrder[]> { return this.fetchTable('sales_orders'); }
  async addSalesOrder(data: Omit<SalesOrder, 'id'>): Promise<SalesOrder> {
    return (await this.insert('sales_orders', { ...data, id: generateId() }))!;
  }
  async updateSalesOrder(id: string, updates: Partial<SalesOrder>) { await this.update('sales_orders', id, updates); }
  
  async confirmSalesOrder(id: string) {
    const { data: order } = await supabase.from('sales_orders').select('*').eq('id', id).single();
    
    if (order && order.status !== 'Confirmed') {
        // 1. Create Sale Record
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
        await this.addSale(saleData);
        
        // 2. Update Order Status
        await this.updateSalesOrder(id, { status: 'Confirmed' });

        // 3. Deduct Inventory (Reduce Stock)
        const inventory = await this.getInventory();
        const invItem = inventory.find(i => i.productId === order.productId);
        if (invItem) {
             const newQty = Math.max(0, invItem.quantity - order.quantity);
             await this.updateInventory(invItem.id, { quantity: newQty });
        }
    }
  }
  async deleteSalesOrder(id: string) { await this.delete('sales_orders', id); }

  // --- Expenses (Purchases) ---
  async getExpenses(): Promise<Expense[]> { return this.fetchTable('expenses'); }
  async addExpense(data: Omit<Expense, 'id'>): Promise<Expense> {
    return (await this.insert('expenses', { ...data, id: generateId() }))!;
  }
  async updateExpense(id: string, updates: Partial<Expense>) { await this.update('expenses', id, updates); }
  async deleteExpense(id: string) { await this.delete('expenses', id); }

  // --- Sales ---
  async getSales(): Promise<Sale[]> { return this.fetchTable('sales'); }
  async addSale(data: Omit<Sale, 'id'>): Promise<Sale> {
    return (await this.insert('sales', { ...data, id: generateId() }))!;
  }
  async updateSale(id: string, updates: Partial<Sale>) { await this.update('sales', id, updates); }
  async deleteSale(id: string) { await this.delete('sales', id); }

  // --- Banks ---
  async getBanks(): Promise<Bank[]> { return this.fetchTable('banks'); }
  async addBank(data: Omit<Bank, 'id'>): Promise<Bank> {
    return (await this.insert('banks', { ...data, id: generateId() }))!;
  }
  async updateBank(id: string, updates: Partial<Bank>) { await this.update('banks', id, updates); }
  async deleteBank(id: string) { await this.delete('banks', id); }

  // --- Employees ---
  async getEmployees(): Promise<Employee[]> { return this.fetchTable('employees'); }
  async addEmployee(data: Omit<Employee, 'id'>): Promise<Employee> {
    return (await this.insert('employees', { ...data, id: generateId() }))!;
  }
  async updateEmployee(id: string, updates: Partial<Employee>) { await this.update('employees', id, updates); }
  async deleteEmployee(id: string) { await this.delete('employees', id); }

  // --- Deductions ---
  async getDeductions(): Promise<Deduction[]> { return this.fetchTable('deductions'); }
  async addDeduction(data: Omit<Deduction, 'id'>): Promise<Deduction> {
    return (await this.insert('deductions', { ...data, id: generateId() }))!;
  }
  async updateDeduction(id: string, updates: Partial<Deduction>) { await this.update('deductions', id, updates); }
  async deleteDeduction(id: string) { await this.delete('deductions', id); }

  // --- Payroll ---
  async getPayroll(): Promise<Payroll[]> { return this.fetchTable('payroll'); }
  async addPayroll(data: Omit<Payroll, 'id'>): Promise<Payroll> {
    return (await this.insert('payroll', { ...data, id: generateId() }))!;
  }
  async updatePayroll(id: string, updates: Partial<Payroll>) { await this.update('payroll', id, updates); }
  async deletePayroll(id: string) { await this.delete('payroll', id); }
}

export const db = new DatabaseService();
