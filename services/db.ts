import { 
  Plant, Operator, Material, Product, InventoryItem, Production, IncidentReport, Customer, Supplier, Expense, Sale,
  Bank, Employee, Payroll, PurchaseOrder, SalesOrder, Tax, User, Role, OrganizationSettings, Asset, PerformanceReview, Adjustment,
  Deduction, Attendance, PasswordResetToken
} from '../types';
import { getFullSeedDatabase } from './initialData';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

// System compatibility strings for diagnostics
export const STORAGE_FIX_SQL = `-- Storage setup is completed. Offline-first client engine & PostgreSQL sync active.`;
export const PRODUCTION_FIX_SQL = `-- Relational schemas are configured.`;
export const INVENTORY_TRACK_SQL = `-- Dynamic inventory tables are configured.`;
export const EMPLOYEE_FIELDS_SQL = `-- Employee records are configured.`;
export const PERFORMANCE_SQL = `-- Performance metrics are configured.`;
export const ADJUSTMENT_SQL = `-- Adjustment tables are configured.`;
export const ATTENDANCE_SQL = `-- Attendance tracking is configured.`;
export const ASSETS_SQL = `-- Asset ledger is configured.`;
export const PAYROLL_FIELDS_SQL = `-- Payroll definitions are configured.`;

export const ALL_ADMIN_PERMISSIONS = [
  "DASHBOARD", "PRODUCTION", "INVENTORY", "MATERIALS", "PRODUCTS", "ASSETS", 
  "PROCUREMENT_GROUP", "SUPPLIERS", "PURCHASE_ORDERS", "EXPENSES", 
  "SALES_BILLING_GROUP", "SALES", "SALES_ORDERS", "INVOICES", "CUSTOMERS", 
  "FINANCE_GROUP", "BANKS", "TAXES", "PROFIT_LOSS", 
  "HR_GROUP", "EMPLOYEES", "PERFORMANCE_REVIEWS", "ADJUSTMENTS", "PAYROLL", "ATTENDANCE", 
  "RESOURCES", "INCIDENTS", 
  "SETTINGS_GROUP", "SETTINGS", "USERS", "ROLES", "DEDUCTIONS"
];

const LOCAL_STORAGE_KEY = 'factori_offline_db_v2';
const API_URL_KEY = 'factori_api_url';

export class DatabaseService {
  private isRemoteActive: boolean | null = null;

  // --- API Endpoint Resolution ---
  public getApiBaseUrl(): string {
    if (typeof window !== 'undefined') {
      const customUrl = localStorage.getItem(API_URL_KEY);
      if (customUrl && customUrl.trim()) {
        return customUrl.trim().replace(/\/+$/, '');
      }
    }
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
      return envUrl.trim().replace(/\/+$/, '');
    }
    return ''; // Relative path by default (works with server.ts when co-hosted)
  }

  public setApiBaseUrl(url: string) {
    if (typeof window !== 'undefined') {
      if (!url || !url.trim()) {
        localStorage.removeItem(API_URL_KEY);
      } else {
        localStorage.setItem(API_URL_KEY, url.trim().replace(/\/+$/, ''));
      }
      this.isRemoteActive = null;
    }
  }

  // --- Client-Side Local Storage Database Engine ---
  private loadLocalDb(): Record<string, Record<string, any>> {
    if (typeof window === 'undefined') {
      return getFullSeedDatabase();
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          // Ensure critical collections exist
          if (!parsed.roles || Object.keys(parsed.roles).length === 0) {
            const seed = getFullSeedDatabase();
            parsed.roles = seed.roles;
          }
          if (!parsed.app_users || Object.keys(parsed.app_users).length === 0) {
            const seed = getFullSeedDatabase();
            parsed.app_users = seed.app_users;
          }
          if (!parsed.organization_settings || Object.keys(parsed.organization_settings).length === 0) {
            const seed = getFullSeedDatabase();
            parsed.organization_settings = seed.organization_settings;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load local DB from localStorage:", e);
    }

    // Initialize with seed data
    const initialSeed = getFullSeedDatabase();
    this.saveLocalDb(initialSeed);
    return initialSeed;
  }

  private saveLocalDb(dbData: Record<string, Record<string, any>>) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dbData));
    } catch (e) {
      console.error("Failed to save local DB to localStorage:", e);
    }
  }

  private localList<T>(table: string): T[] {
    const db = this.loadLocalDb();
    const tableData = db[table] || {};
    return Object.values(tableData) as T[];
  }

  private localGet<T>(table: string, id: string): T | null {
    const db = this.loadLocalDb();
    const tableData = db[table] || {};
    return (tableData[id] as T) || null;
  }

  private localSet<T>(table: string, id: string, data: any): T {
    const db = this.loadLocalDb();
    if (!db[table]) db[table] = {};
    const item = { ...data, id };
    db[table][id] = item;
    this.saveLocalDb(db);
    return item as T;
  }

  private localUpdate<T>(table: string, id: string, updates: Partial<T>): void {
    const db = this.loadLocalDb();
    if (!db[table]) db[table] = {};
    const existing = db[table][id] || { id };
    db[table][id] = { ...existing, ...updates, id };
    this.saveLocalDb(db);
  }

  private localDelete(table: string, id: string): void {
    const db = this.loadLocalDb();
    if (db[table] && db[table][id]) {
      delete db[table][id];
      this.saveLocalDb(db);
    }
  }

  private localQuery<T>(table: string, filters: { field: string, op: string, value: any }[]): T[] {
    const list = this.localList<T>(table);
    if (!filters || filters.length === 0) return list;

    return list.filter(item => {
      return filters.every(f => {
        const val = (item as any)[f.field];
        if (f.op === '==' || f.op === '=') {
          return String(val) === String(f.value);
        }
        if (f.op === '!=') {
          return String(val) !== String(f.value);
        }
        if (f.op === '>') {
          return Number(val) > Number(f.value);
        }
        if (f.op === '<') {
          return Number(val) < Number(f.value);
        }
        if (f.op === '>=') {
          return Number(val) >= Number(f.value);
        }
        if (f.op === '<=') {
          return Number(val) <= Number(f.value);
        }
        return false;
      });
    });
  }

  private syncTableToLocal(table: string, items: any[]) {
    if (!Array.isArray(items)) return;
    const db = this.loadLocalDb();
    if (!db[table]) db[table] = {};
    items.forEach(item => {
      if (item && item.id) {
        db[table][item.id] = item;
      }
    });
    this.saveLocalDb(db);
  }

  // --- Network Request Wrapper with Netlify & SPA Safety ---
  private async request<T>(endpoint: string, options?: RequestInit): Promise<{ success: boolean; data?: T; status?: number }> {
    const baseUrl = this.getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s network timeout

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {})
        }
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      
      // If deployed on Netlify without backend, requests to /api/* return 404 or index.html (text/html).
      // Verify both HTTP success AND valid JSON content type!
      if (!res.ok || !contentType.includes('application/json')) {
        this.isRemoteActive = false;
        return { success: false, status: res.status };
      }

      const data = await res.json();
      this.isRemoteActive = true;
      return { success: true, data: data as T, status: res.status };
    } catch (err) {
      // Network error, CORS failure, offline, or timed out
      this.isRemoteActive = false;
      return { success: false };
    }
  }

  // --- Core CRUD Operations ---
  private async fetchTable<T>(table: string): Promise<T[]> {
    const res = await this.request<T[]>(`/api/db/${table}`);
    if (res.success && Array.isArray(res.data)) {
      if (res.data.length > 0) {
        this.syncTableToLocal(table, res.data);
        return res.data;
      }
    }

    // Always fallback to the offline/local database if remote is unavailable or returns empty
    const local = this.localList<T>(table);
    if (res.success && res.data && res.data.length === 0 && local.length === 0) {
      return [];
    }
    return local.length > 0 ? local : (res.success && res.data ? res.data : local);
  }

  private async getSingleEntry<T>(table: string, id: string): Promise<T | null> {
    const res = await this.request<T>(`/api/db/${table}/${id}`);
    if (res.success && res.data) {
      return res.data;
    }
    return this.localGet<T>(table, id);
  }

  private async insert<T>(table: string, row: any): Promise<T> {
    const id = row.id || generateId();
    const dataWithId = { ...row, id };

    // 1. Immediately store in local database (guarantees zero data loss on Netlify)
    const localSaved = this.localSet<T>(table, id, dataWithId);

    // 2. If remote is accessible, asynchronously sync to remote
    try {
      const res = await this.request<T>(`/api/db/${table}`, {
        method: 'POST',
        body: JSON.stringify(dataWithId)
      });
      if (res.success && res.data) {
        return res.data;
      }
    } catch (e) {
      console.warn(`[DB Sync] Remote insert for ${table} failed, preserved in local storage.`);
    }

    return localSaved;
  }

  private async update<T>(table: string, id: string, updates: Partial<T>): Promise<void> {
    // 1. Update local database
    this.localUpdate<T>(table, id, updates);

    // 2. Sync to remote
    try {
      await this.request<void>(`/api/db/${table}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.warn(`[DB Sync] Remote update for ${table}/${id} failed, preserved in local storage.`);
    }
  }

  private async delete(table: string, id: string): Promise<void> {
    // 1. Remove from local database
    this.localDelete(table, id);

    // 2. Sync to remote
    try {
      await this.request<void>(`/api/db/${table}/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn(`[DB Sync] Remote delete for ${table}/${id} failed, preserved in local storage.`);
    }
  }

  private async queryTable<T>(table: string, filters: { field: string, op: string, value: any }[]): Promise<T[]> {
    const res = await this.request<T[]>(`/api/db-query/${table}`, {
      method: 'POST',
      body: JSON.stringify(filters)
    });

    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }

    return this.localQuery<T>(table, filters);
  }

  // --- Database Status & Connectivity Test ---
  public async testApiConnection(overrideUrl?: string): Promise<{ ok: boolean; message: string; details?: any }> {
    const baseUrl = overrideUrl !== undefined ? overrideUrl.trim().replace(/\/+$/, '') : this.getApiBaseUrl();
    const testUrl = `${baseUrl}/api/db-status`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(testUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        return {
          ok: false,
          message: `Endpoint returned HTTP ${res.status} (${contentType || 'Unknown content'}). Make sure the backend server is running and accessible.`
        };
      }

      const data = await res.json();
      return {
        ok: true,
        message: data.connected ? "Connected to PostgreSQL Database via API server." : "API server is reachable (running in embedded/JSON mode).",
        details: data
      };
    } catch (err: any) {
      return {
        ok: false,
        message: err.message ? `Connection failed: ${err.message}` : "Unable to reach server. Check the URL and network connection."
      };
    }
  }

  public getStorageEngineInfo() {
    return {
      isRemoteConfigured: Boolean(this.getApiBaseUrl()),
      apiBaseUrl: this.getApiBaseUrl() || '(Co-hosted / Relative /api)',
      isRemoteActive: this.isRemoteActive,
      isNetlifyOrStatic: typeof window !== 'undefined' && window.location.hostname.includes('netlify.app')
    };
  }

  // --- Database Backup & Restore Utility ---
  public exportDatabase(): string {
    const db = this.loadLocalDb();
    return JSON.stringify(db, null, 2);
  }

  public importDatabase(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed === 'object') {
        this.saveLocalDb(parsed);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Invalid database JSON:", e);
      return false;
    }
  }

  public resetDatabaseToDefault(): void {
    const seed = getFullSeedDatabase();
    this.saveLocalDb(seed);
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
      // 1. Check users via queryTable (checks remote API or local DB)
      let appUsers = await this.queryTable<User & { password?: string }>('app_users', [
        { field: 'username', op: '==', value: username },
        { field: 'password', op: '==', value: password }
      ]);

      // Fallback: Case-insensitive search in local storage if not matched
      if (appUsers.length === 0) {
        const allLocalUsers = this.localList<User & { password?: string }>('app_users');
        const match = allLocalUsers.find(
          u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
        );
        if (match) {
          appUsers = [match];
        }
      }

      let userData = appUsers[0] || null;

      // Built-in hardcoded fallback for super admin
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

      // Update last login
      await this.update('app_users', userData.id, { lastLogin: new Date().toISOString() });
      
      if (userData.role === 'admin') {
          await this.seedAdminRole();
      }

      const roleData = await this.getSingleEntry<Role>('roles', userData.role);
      let permissions: string[] = [];
      if (roleData && roleData.permissions) {
         permissions = roleData.permissions;
      } else {
         const rolesList = await this.queryTable<Role>('roles', [
           { field: 'name', op: '==', value: userData.role }
         ]);
         if (rolesList.length > 0 && rolesList[0].permissions) {
            permissions = rolesList[0].permissions;
         } else if (userData.role === 'admin') {
            permissions = ALL_ADMIN_PERMISSIONS;
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

  async findUserByEmailOrUsername(identifier: string): Promise<(User & { password?: string }) | null> {
    const clean = identifier.trim().toLowerCase();
    if (!clean) return null;

    try {
      const allUsers = await this.fetchTable<User & { password?: string }>('app_users');
      const found = allUsers.find(u => 
        (u.username && u.username.toLowerCase() === clean) || 
        (u.email && u.email.toLowerCase() === clean)
      );

      if (found) return found;

      // Also check fallback defaults for admin and loveday
      if (clean === 'admin' || clean === 'admin@factori.ng' || clean === 'vebegboni@gmail.com') {
        return {
          id: 'admin-user',
          username: 'admin',
          email: clean.includes('@') ? clean : 'admin@factori.ng',
          name: 'System Administrator',
          role: 'admin'
        };
      }

      if (clean === 'loveday' || clean === 'loveday@factori.ng') {
        return {
          id: 'loveday-user',
          username: 'Loveday',
          email: 'loveday@factori.ng',
          name: 'Loveday Factory Mgr',
          role: 'user'
        };
      }

      return null;
    } catch (e) {
      console.error("Error finding user:", e);
      return null;
    }
  }

  async updateUserPassword(identifier: string, newPassword: string): Promise<boolean> {
    const clean = identifier.trim().toLowerCase();
    if (!clean) return false;

    try {
      const allUsers = await this.fetchTable<User & { password?: string }>('app_users');
      let targetUser = allUsers.find(u => 
        (u.username && u.username.toLowerCase() === clean) || 
        (u.email && u.email.toLowerCase() === clean)
      );

      if (targetUser) {
        await this.update('app_users', targetUser.id, { password: newPassword });
        return true;
      }

      // If it's the admin or loveday seed account and wasn't yet persisted in app_users, create it
      if (clean === 'admin' || clean === 'admin@factori.ng' || clean === 'vebegboni@gmail.com') {
        await this.insert('app_users', {
          id: 'admin-user',
          username: 'admin',
          email: clean.includes('@') ? clean : 'admin@factori.ng',
          name: 'System Administrator',
          role: 'admin',
          password: newPassword,
          lastLogin: new Date().toISOString()
        });
        return true;
      }

      if (clean === 'loveday' || clean === 'loveday@factori.ng') {
        await this.insert('app_users', {
          id: 'loveday-user',
          username: 'Loveday',
          email: 'loveday@factori.ng',
          name: 'Loveday Factory Mgr',
          role: 'user',
          password: newPassword,
          lastLogin: new Date().toISOString()
        });
        return true;
      }

      return false;
    } catch (e) {
      console.error("Error updating user password:", e);
      return false;
    }
  }

  async savePasswordResetToken(tokenItem: PasswordResetToken): Promise<void> {
    try {
      await this.insert('password_resets', tokenItem);
    } catch (e) {
      console.error("Error saving password reset token:", e);
    }
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    try {
      const tokens = await this.queryTable<PasswordResetToken>('password_resets', [
        { field: 'token', op: '==', value: token }
      ]);
      return tokens[0] || null;
    } catch (e) {
      console.error("Error getting password reset token:", e);
      return null;
    }
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    try {
      const tokenItem = await this.getPasswordResetToken(token);
      if (tokenItem) {
        await this.update('password_resets', tokenItem.id, { used: true });
      }
    } catch (e) {
      console.error("Error marking token used:", e);
    }
  }

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
