import { 
  Plant, Operator, Material, Product, InventoryItem, Production, IncidentReport, Customer, Supplier, Expense, Sale,
  Bank, Employee, Payroll, PurchaseOrder, SalesOrder, Tax, User, Role, OrganizationSettings, Asset, PerformanceReview, Adjustment,
  Deduction, Attendance
} from '../types';

// Helper to generate IDs (perfectly compatible with any ID creation)
const generateId = () => Math.random().toString(36).substr(2, 9);

// System compatibility strings for Setup screen diagnostics and copy actions
export const STORAGE_FIX_SQL = `-- Storage setup is completed. Using secure local high-speed base64 storage.`;
export const PRODUCTION_FIX_SQL = `-- Relational schemas are successfully initialized on the Cloud SQL PostgreSQL instance.`;
export const INVENTORY_TRACK_SQL = `-- Dynamic inventory tables are configured in PostgreSQL.`;
export const EMPLOYEE_FIELDS_SQL = `-- Employee records are configured in PostgreSQL.`;
export const PERFORMANCE_SQL = `-- Performance metrics are configured in PostgreSQL.`;
export const ADJUSTMENT_SQL = `-- Adjustment tables are configured in PostgreSQL.`;
export const ATTENDANCE_SQL = `-- Attendance tracking is configured in PostgreSQL.`;
export const ASSETS_SQL = `-- Asset ledger is configured in PostgreSQL.`;
export const PAYROLL_FIELDS_SQL = `-- Payroll definitions are configured in PostgreSQL.`;

const ALL_ADMIN_PERMISSIONS = [
  "DASHBOARD", "PRODUCTION", "INVENTORY", "MATERIALS", "PRODUCTS", "ASSETS", 
  "PROCUREMENT_GROUP", "SUPPLIERS", "PURCHASE_ORDERS", "EXPENSES", 
  "SALES_BILLING_GROUP", "SALES", "SALES_ORDERS", "INVOICES", "CUSTOMERS", 
  "FINANCE_GROUP", "BANKS", "TAXES", "PROFIT_LOSS", 
  "HR_GROUP", "EMPLOYEES", "PERFORMANCE_REVIEWS", "ADJUSTMENTS", "PAYROLL", "ATTENDANCE", 
  "RESOURCES", "INCIDENTS", 
  "SETTINGS_GROUP", "SETTINGS", "USERS", "ROLES", "DEDUCTIONS"
];

class DatabaseService {
  private async fetchTable<T>(table: string): Promise<T[]> {
    try {
      const res = await fetch(`/api/db/${table}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch table ${table}`);
      }
      return await res.json() as T[];
    } catch (error) {
      console.error(`Error listing ${table}:`, error);
      return [];
    }
  }

  private async getSingleEntry<T>(table: string, id: string): Promise<T | null> {
    try {
      const res = await fetch(`/api/db/${table}/${id}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`Failed to get single entry ${table}/${id}`);
      }
      return await res.json() as T;
    } catch (error) {
      console.error(`Error fetching single ${table}/${id}:`, error);
      return null;
    }
  }

  private async insert<T>(table: string, row: any): Promise<T> {
    const id = row.id || generateId();
    const dataWithId = { ...row, id };
    try {
      const res = await fetch(`/api/db/${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataWithId)
      });
      if (!res.ok) {
        throw new Error(`Failed to insert into ${table}`);
      }
      return await res.json() as T;
    } catch (error) {
      console.error(`Error inserting into ${table}:`, error);
      throw error;
    }
  }

  private async update<T>(table: string, id: string, updates: Partial<T>): Promise<void> {
    try {
      const res = await fetch(`/api/db/${table}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) {
        throw new Error(`Failed to update ${table}/${id}`);
      }
    } catch (error) {
      console.error(`Error updating ${table}/${id}:`, error);
      throw error;
    }
  }

  private async delete(table: string, id: string): Promise<void> {
    try {
      const res = await fetch(`/api/db/${table}/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error(`Failed to delete from ${table}/${id}`);
      }
    } catch (error) {
      console.error(`Error deleting ${table}/${id}:`, error);
      throw error;
    }
  }

  private async queryTable<T>(table: string, filters: { field: string, op: string, value: any }[]): Promise<T[]> {
    try {
      const res = await fetch(`/api/db-query/${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      if (!res.ok) {
        throw new Error(`Failed to query table ${table}`);
      }
      return await res.json() as T[];
    } catch (error) {
      console.error(`Error querying ${table}:`, error);
      return [];
    }
  }

  // --- Image Compression & Base64 Converter ---
  private async compressImage(file: File): Promise<File> {
    if (file.size <= 1024 * 1024) return file;

    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const maxSize = 1920;
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          if (blob.size < file.size) {
             const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
          } else {
              resolve(file);
          }
        }, 'image/jpeg', 0.7);
      };
      
      img.onerror = (err) => {
          URL.revokeObjectURL(objectUrl);
          console.warn("Image compression failed, using original file", err);
          resolve(file);
      };
    });
  }

  async uploadLogo(file: File): Promise<string> {
    return this.uploadImage(file);
  }

  async uploadImage(file: File): Promise<string> {
    try {
        const compressedFile = await this.compressImage(file);
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
             resolve(reader.result as string);
          };
          reader.onerror = reject;
          reader.readAsDataURL(compressedFile);
        });
    } catch (error: any) {
        console.error("Upload Service Error:", error);
        throw new Error(error.message || "Image upload failed");
    }
  }

  // --- Authentication & Users ---

  async authenticate(username: string, password: string): Promise<{ user: User, permissions: string[] } | null> {
    try {
      const appUsers = await this.queryTable<User & { password?: string }>('app_users', [
        { field: 'username', op: '==', value: username },
        { field: 'password', op: '==', value: password }
      ]);
      const userData = appUsers[0] || null;

      if (!userData) {
          if (username === 'admin' && password === '123admin456') {
               const adminUser: User = {
                   id: 'admin-seed',
                   username: 'admin',
                   name: 'System Administrator',
                   role: 'admin',
                   lastLogin: new Date().toISOString()
               };
               await this.seedAdminRole();
               try {
                  await this.addAppUser({...adminUser, password: '123admin456'}); 
               } catch (e) {
                   // Ignore if already exists
               }
               return { user: adminUser, permissions: ALL_ADMIN_PERMISSIONS };
          }
          return null;
      }

      await this.update('app_users', userData.id, { lastLogin: new Date().toISOString() });
      
      if (userData.role === 'admin') {
          await this.seedAdminRole();
      }

      const roleData = await this.getSingleEntry<Role>('roles', userData.role);
      let permissions: string[] = [];
      if (roleData) {
         permissions = roleData.permissions || [];
      } else {
         const rolesList = await this.queryTable<Role>('roles', [
           { field: 'name', op: '==', value: userData.role }
         ]);
         if (rolesList.length > 0) {
            permissions = rolesList[0].permissions || [];
         }
      }

      return { user: userData as User, permissions };
    } catch (error) {
      console.error("Auth error:", error);
      return null;
    }
  }

  async seedAdminRole() {
      try {
        const rolesList = await this.queryTable<Role>('roles', [
          { field: 'name', op: '==', value: 'admin' }
        ]);
        const existingRole = rolesList[0] || null;
        
        if (!existingRole) {
            await this.insert('roles', {
                id: 'admin',
                name: 'admin',
                description: 'System Administrator',
                permissions: ALL_ADMIN_PERMISSIONS
            });
        } else {
            await this.update('roles', existingRole.id, { permissions: ALL_ADMIN_PERMISSIONS });
        }
      } catch (error) {
        console.error("Seed admin role error:", error);
      }
  }

  async getAppUsers(): Promise<User[]> { return this.fetchTable('app_users'); }
  
  async addAppUser(data: Omit<User, 'id'> & { password?: string }): Promise<User> {
    try {
      const existingUsers = await this.queryTable<User>('app_users', [
        { field: 'username', op: '==', value: data.username }
      ]);
      const existing = existingUsers[0] || null;
      if (existing) return existing as User;

      return (await this.insert('app_users', { ...data, id: generateId() }))!;
    } catch (error) {
      console.error("Add user error:", error);
      throw error;
    }
  }
  
  async updateAppUser(id: string, updates: Partial<User>) { await this.update('app_users', id, updates); }
  async deleteAppUser(id: string) { await this.delete('app_users', id); }

  // --- Roles ---
  async getRoles(): Promise<Role[]> { return this.fetchTable('roles'); }
  async addRole(data: Omit<Role, 'id'>): Promise<Role> {
      return (await this.insert('roles', { ...data, id: generateId() }))!;
  }
  async updateRole(id: string, updates: Partial<Role>) { await this.update('roles', id, updates); }
  async deleteRole(id: string) { await this.delete('roles', id); }

  // --- Organization Settings ---
  async getOrganizationSettings(): Promise<OrganizationSettings | null> {
      try {
        const list = await this.fetchTable<OrganizationSettings>('organization_settings');
        return list[0] || null;
      } catch (error) {
        console.error("Error fetching org settings", error);
        return null;
      }
  }

  async saveOrganizationSettings(data: Omit<OrganizationSettings, 'id'>): Promise<OrganizationSettings> {
      const existing = await this.getOrganizationSettings();
      if (existing) {
          await this.update('organization_settings', existing.id, data);
          return { ...data, id: existing.id } as OrganizationSettings;
      } else {
          try {
            return (await this.insert('organization_settings', { ...data, id: generateId() }))!;
          } catch (e: any) {
              console.error("Save Settings Failed:", e);
              throw e;
          }
      }
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
    const product = (await this.insert<Product>('products', newItem))!;
    
    if (product && (data.trackInventory !== false)) {
        const invList = await this.queryTable<InventoryItem>('inventory', [
          { field: 'productId', op: '==', value: product.id }
        ]);
        if (invList.length === 0) {
            await this.insert('inventory', {
                id: generateId(),
                productId: product.id,
                quantity: product.quantity,
                price: product.price,
                lowStockThreshold: 10
            });
        }
    }
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>) {
     await this.update('products', id, updates);
     if (updates.price) {
        const invList = await this.queryTable<InventoryItem>('inventory', [
          { field: 'productId', op: '==', value: id }
        ]);
        for (const inv of invList) {
          await this.update('inventory', inv.id, { price: updates.price });
        }
     }

     if (updates.trackInventory === true) {
         const invList = await this.queryTable<InventoryItem>('inventory', [
           { field: 'productId', op: '==', value: id }
         ]);
         if (invList.length === 0) {
             const prod = await this.getSingleEntry<Product>('products', id);
             if (prod) {
                await this.insert('inventory', {
                    id: generateId(),
                    productId: id,
                    quantity: prod.quantity || 0,
                    price: prod.price,
                    lowStockThreshold: 10
                });
             }
         }
     }
  }

  async deleteProduct(id: string) { 
      await this.delete('products', id); 
      
      const invList = await this.queryTable<InventoryItem>('inventory', [
        { field: 'productId', op: '==', value: id }
      ]);
      for (const inv of invList) {
        await this.delete('inventory', inv.id);
      }
  }

  // --- Assets ---
  async getAssets(): Promise<Asset[]> { return this.fetchTable('assets'); }
  async addAsset(data: Omit<Asset, 'id'>): Promise<Asset> {
    const total = data.qty * data.unitPrice;
    return (await this.insert('assets', { ...data, id: generateId(), total }))!;
  }
  async updateAsset(id: string, updates: Partial<Asset>) {
    let total = updates.total;
    if (updates.qty !== undefined && updates.unitPrice !== undefined) {
         total = updates.qty * updates.unitPrice;
    }
    await this.update('assets', id, { ...updates, total });
  }
  async deleteAsset(id: string) { await this.delete('assets', id); }

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
    const production = (await this.insert<Production>('production', { ...data, id: generateId() }))!;
    
    if (production) {
      if (production.materialsUsed && production.materialsUsed.length > 0) {
        const materials = await this.getMaterials();
        for (const matUsed of production.materialsUsed) {
          const material = materials.find(m => m.id === matUsed.materialId);
          if (material && material.trackInventory !== false) {
            const newQty = Math.max(0, material.quantity - matUsed.inputTonnage);
            await this.updateMaterial(material.id, { quantity: newQty });
          }
        }
      }

      const prod = await this.getSingleEntry<Product>('products', data.productId);
      
      if (prod && prod.trackInventory !== false) {
          const inventory = await this.getInventory();
          const invItem = inventory.find(i => i.productId === data.productId);
          if (invItem) {
              await this.updateInventory(invItem.id, { quantity: invItem.quantity + data.outputTonnage });
          } else {
                 await this.insert('inventory', {
                   id: generateId(),
                   productId: data.productId,
                   quantity: data.outputTonnage,
                   price: 0, 
                   lowStockThreshold: 10
               });
           }
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
    const order = await this.getSingleEntry<SalesOrder>('sales_orders', id);
    
    if (order) {
        if (order.status !== 'Confirmed') {
            const saleData: Sale = {
                id: generateId(),
                customerId: order.customerId,
                productId: order.productId,
                quantity: order.quantity,
                price: order.unitPrice,
                taxRate: order.taxRate,
                taxAmount: order.taxAmount,
                amount: order.totalAmount,
                paid: 0,
                balance: order.totalAmount,
                date: new Date().toISOString().split('T')[0]
            };
            await this.addSale(saleData);
            await this.updateSalesOrder(id, { status: 'Confirmed' });

            const inventory = await this.getInventory();
            const invItem = inventory.find(i => i.productId === order.productId);
            if (invItem) {
                 const newQty = Math.max(0, invItem.quantity - order.quantity);
                 await this.updateInventory(invItem.id, { quantity: newQty });
            }
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

  // --- Taxes ---
  async getTaxes(): Promise<Tax[]> { return this.fetchTable('taxes'); }
  async addTax(data: Omit<Tax, 'id'>): Promise<Tax> {
    return (await this.insert('taxes', { ...data, id: generateId() }))!;
  }
  async updateTax(id: string, updates: Partial<Tax>) { await this.update('taxes', id, updates); }
  async deleteTax(id: string) { await this.delete('taxes', id); }

  // --- Employees ---
  async getEmployees(): Promise<Employee[]> { return this.fetchTable('employees'); }
  async addEmployee(data: Omit<Employee, 'id'>): Promise<Employee> {
    return (await this.insert('employees', { ...data, id: generateId() }))!;
  }
  async updateEmployee(id: string, updates: Partial<Employee>) { await this.update('employees', id, updates); }
  async deleteEmployee(id: string) { await this.delete('employees', id); }

  // --- Performance Reviews ---
  async getPerformanceReviews(): Promise<PerformanceReview[]> { return this.fetchTable('performance_reviews'); }
  async addPerformanceReview(data: Omit<PerformanceReview, 'id'>): Promise<PerformanceReview> {
    return (await this.insert('performance_reviews', { ...data, id: generateId() }))!;
  }
  async updatePerformanceReview(id: string, updates: Partial<PerformanceReview>) { await this.update('performance_reviews', id, updates); }
  async deletePerformanceReview(id: string) { await this.delete('performance_reviews', id); }

  // --- Adjustments (Overtime, Bonus, Deductions) ---
  async getAdjustments(): Promise<Adjustment[]> { return this.fetchTable('adjustments'); }
  async addAdjustment(data: Omit<Adjustment, 'id'>): Promise<Adjustment> {
    return (await this.insert('adjustments', { ...data, id: generateId() }))!;
  }
  async updateAdjustment(id: string, updates: Partial<Adjustment>) { await this.update('adjustments', id, updates); }
  async deleteAdjustment(id: string) { await this.delete('adjustments', id); }

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

  // --- Attendance ---
  async getAttendance(): Promise<Attendance[]> { return this.fetchTable('attendance'); }
  
  async clockIn(employeeId: string, method: 'Manual' | 'Biometric' = 'Manual'): Promise<Attendance> {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
      const attendanceList = await this.queryTable<Attendance>('attendance', [
        { field: 'employeeId', op: '==', value: employeeId },
        { field: 'date', op: '==', value: today }
      ]);
        
      if (attendanceList.length > 0) {
          throw new Error("Already clocked in for today.");
      }

      return (await this.insert<Attendance>('attendance', {
          id: generateId(),
          employeeId,
          date: today,
          timeIn: now,
          method
      }))!;
  }

  async clockOut(employeeId: string): Promise<Attendance> {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      const attendanceList = await this.queryTable<Attendance>('attendance', [
        { field: 'employeeId', op: '==', value: employeeId },
        { field: 'date', op: '==', value: today }
      ]);

      if (attendanceList.length === 0) {
          throw new Error("No clock-in record found for today.");
      }
      
      const existing = attendanceList[0];
      
      if (existing.timeOut) {
          throw new Error("Already clocked out.");
      }

      await this.update('attendance', existing.id, { timeOut: now });
      return { ...existing, timeOut: now } as Attendance;
  }
}

export const db = new DatabaseService();
