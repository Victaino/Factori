
import { supabase } from './supabase';
import { 
  Plant, Operator, Material, Product, InventoryItem, Production, IncidentReport, Customer, Supplier, Expense, Sale,
  Bank, Employee, Deduction, Payroll, PurchaseOrder, SalesOrder, Tax, User, Role, OrganizationSettings
} from '../types';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export const STORAGE_FIX_SQL = `
-- Run this in Supabase SQL Editor to fix Storage permissions
-- 1. Create the bucket (Safe to run even if it exists)
insert into storage.buckets (id, name, public)
values ('organization-assets', 'organization-assets', true)
on conflict (id) do nothing;

-- 2. Create the Access Policy
-- We use a unique name to avoid conflicts if you run this multiple times.
-- If you get a "policy already exists" error, that is fine/success.
create policy "Organization Assets Public Access 2"
on storage.objects for all
using ( bucket_id = 'organization-assets' )
with check ( bucket_id = 'organization-assets' );
`;

export const PRODUCTION_FIX_SQL = `
-- Run this in Supabase SQL Editor to support multiple materials and dynamic units in production
ALTER TABLE production ADD COLUMN IF NOT EXISTS "materialsUsed" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE production ADD COLUMN IF NOT EXISTS "outputUnit" text DEFAULT 'Tons';
`;

class DatabaseService {
  
  private async fetchTable<T>(table: string): Promise<T[]> {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error fetching ${table}:`, error);
      return [];
    }
    return data as T[];
  }

  private async insert<T>(table: string, row: T): Promise<T> {
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) {
      console.error(`Error inserting into ${table}:`, JSON.stringify(error, null, 2));
      throw new Error(`Failed to insert into ${table}: ${error.message}`);
    }
    return data as T;
  }

  private async update<T>(table: string, id: string, updates: Partial<T>): Promise<void> {
    const { error } = await supabase.from(table).update(updates).eq('id', id);
    if (error) {
        console.error(`Error updating ${table}:`, error);
        throw new Error(`Failed to update ${table}: ${error.message}`);
    }
  }

  private async delete(table: string, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) console.error(`Error deleting from ${table}:`, error);
  }

  // --- Image Compression Helper ---
  private async compressImage(file: File): Promise<File> {
    // If file is already < 1MB, return it
    if (file.size <= 1024 * 1024) return file;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl); // Clean up
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down if too large (max 1920px width/height)
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
            resolve(file); // Fallback
            return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with 0.7 quality
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          // If compression worked and result is smaller, use it. Otherwise use original.
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
          resolve(file); // Fallback to original on error
      };
    });
  }

  // --- File Upload ---
  async uploadLogo(file: File): Promise<string> {
    return this.uploadImage(file);
  }

  async uploadImage(file: File): Promise<string> {
    try {
        // 1. Compress Image
        const compressedFile = await this.compressImage(file);

        const fileName = `asset-${Date.now()}-${compressedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        
        // 2. Upload to 'organization-assets' bucket
        const { data, error } = await supabase.storage
            .from('organization-assets')
            .upload(fileName, compressedFile, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            // Enhanced error message for common setup issue
            if (error.message.includes('not found') || (error as any).statusCode === '404') {
                throw new Error("Storage bucket 'organization-assets' not found. Please go to Supabase Dashboard -> Storage -> Create a new public bucket named 'organization-assets'.");
            }
            if (error.message.includes('row-level security') || error.message.includes('policy')) {
                throw new Error("Upload Permission Denied. Go to Supabase Storage -> Policies -> Add Policy to allow INSERT/SELECT for 'organization-assets'.");
            }
            throw error;
        }

        // 3. Get Public URL
        const { data: publicUrlData } = supabase.storage
            .from('organization-assets')
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
    } catch (error: any) {
        // Only log truly unexpected errors to avoid console noise for known config issues
        const msg = error.message || "Image upload failed";
        if (!msg.includes('not found') && !msg.includes('Permission Denied') && !msg.includes('row-level security')) {
             console.error("Upload Service Error:", error);
        }
        throw new Error(msg);
    }
  }

  // --- Authentication & Users ---

  async authenticate(username: string, password: string): Promise<{ user: User, permissions: string[] } | null> {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username)
      .eq('password', password) // Note: In production, verify hash, don't query plain text
      .single();

    if (error || !data) {
        // Fallback for the hardcoded admin if database table is empty or connection issues during initial setup
        if (username === 'admin' && password === '123admin456') {
             // Ensure this user actually exists in DB to prevent future confusion
             const adminUser: User = {
                 id: 'admin-seed',
                 username: 'admin',
                 name: 'System Administrator',
                 role: 'admin',
                 lastLogin: new Date().toISOString()
             };
             // Ensure Admin Role exists
             await this.seedAdminRole();
             // Try to seed user silently
             try {
                await this.addAppUser({...adminUser, password: '123admin456'}); 
             } catch (e) {
                 // Ignore if already exists
             }
             // Return admin with ALL privileges (handled by permissions or logic)
             return { user: adminUser, permissions: ['ALL'] };
        }
        return null;
    }

    // Update last login
    await this.update('app_users', data.id, { lastLogin: new Date().toISOString() });
    
    // Fetch Permissions for the user's role
    const { data: roleData } = await supabase.from('roles').select('permissions').eq('name', data.role).single();
    
    const permissions = roleData?.permissions || [];

    // Fallback: If it's the specific admin user, ensure they have access even if role table fails
    if (data.username === 'admin' && permissions.length === 0) {
        return { user: data as User, permissions: ['ALL'] };
    }

    return { user: data as User, permissions };
  }

  async seedAdminRole() {
      // Create admin role if it doesn't exist
      const { data } = await supabase.from('roles').select('*').eq('name', 'admin').single();
      if (!data) {
          // Grant access to basic views + settings
          const allPerms = ["DASHBOARD", "PRODUCTION", "INVENTORY", "MATERIALS", "PRODUCTS", "PROCUREMENT_GROUP", "SUPPLIERS", "PURCHASE_ORDERS", "EXPENSES", "SALES_BILLING_GROUP", "SALES", "SALES_ORDERS", "INVOICES", "CUSTOMERS", "FINANCE_GROUP", "BANKS", "TAXES", "PROFIT_LOSS", "HR_GROUP", "EMPLOYEES", "PAYROLL", "DEDUCTIONS", "RESOURCES", "INCIDENTS", "SETTINGS_GROUP", "SETTINGS", "USERS", "ROLES"];
          await this.insert('roles', {
              id: generateId(),
              name: 'admin',
              description: 'System Administrator',
              permissions: allPerms
          });
      }
  }

  async getAppUsers(): Promise<User[]> { return this.fetchTable('app_users'); }
  
  async addAppUser(data: Omit<User, 'id'> & { password?: string }): Promise<User> {
    // Check for existing username
    const { data: existing } = await supabase.from('app_users').select('*').eq('username', data.username).single();
    if(existing) return existing as User;

    return (await this.insert('app_users', { ...data, id: generateId() }))!;
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
      const { data, error } = await supabase.from('organization_settings').select('*').limit(1).maybeSingle();
      if (error) console.error("Error fetching org settings", error);
      return data as OrganizationSettings;
  }

  async saveOrganizationSettings(data: Omit<OrganizationSettings, 'id'>): Promise<OrganizationSettings> {
      // Check if exists
      const existing = await this.getOrganizationSettings();
      if (existing) {
          await this.update('organization_settings', existing.id, data);
          return { ...data, id: existing.id };
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
    // Note: complex logic for amount updates should optimally be handled, keeping it simple for async conversion
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
        // Check if an inventory item already exists for this product (redundancy check)
        const { data: existing } = await supabase.from('inventory').select('*').eq('productId', product.id).single();
        
        if (!existing) {
            await this.insert('inventory', {
                id: generateId(),
                productId: product.id,
                quantity: product.quantity, // Initial stock from definition
                price: product.price,
                lowStockThreshold: 10 // Default threshold
            });
        }
    }
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>) {
     await this.update('products', id, updates);
     // Note: If price changes, you might want to update the price in inventory table as well
     if (updates.price) {
        const { error } = await supabase.from('inventory').update({ price: updates.price }).eq('productId', id);
        if (error) console.error("Error syncing product price to inventory", error);
     }
  }

  async deleteProduct(id: string) { 
      // 1. Delete the Product Definition
      await this.delete('products', id); 
      
      // 2. Cascade Delete: Remove the corresponding Inventory Record
      // We use raw supabase call here because we need to delete by productId, not primary key id
      const { error } = await supabase.from('inventory').delete().eq('productId', id);
      if (error) console.error(`Error deleting inventory for product ${id}:`, error);
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
      // 1. Consume Materials (Reduce Stock)
      if (production.materialsUsed && production.materialsUsed.length > 0) {
        const materials = await this.getMaterials(); // Fetch all materials once
        for (const matUsed of production.materialsUsed) {
          const material = materials.find(m => m.id === matUsed.materialId);
          if (material) {
            const newQty = Math.max(0, material.quantity - matUsed.inputTonnage);
            await this.updateMaterial(material.id, { quantity: newQty });
          }
        }
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
            taxRate: order.taxRate,
            taxAmount: order.taxAmount,
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
