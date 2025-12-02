
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ProductionManager } from './components/ProductionManager';
import { InventoryManager } from './components/InventoryManager';
import { IncidentManager } from './components/IncidentManager';
import { ResourceManager } from './components/ResourceManager';
import { CustomerManager } from './components/CustomerManager';
import { SupplierManager } from './components/SupplierManager';
import { PurchaseOrderManager } from './components/PurchaseOrderManager';
import { SalesOrderManager } from './components/SalesOrderManager';
import { ExpenseManager } from './components/ExpenseManager';
import { SalesManager } from './components/SalesManager';
import { EmployeeManager } from './components/EmployeeManager';
import { BankManager } from './components/BankManager';
import { DeductionManager } from './components/DeductionManager';
import { PayrollManager } from './components/PayrollManager';
import { InvoiceManager } from './components/InvoiceManager';
import { SettingsManager } from './components/SettingsManager';
import { TaxManager } from './components/TaxManager';
import { ProfitLossManager } from './components/ProfitLossManager';
import { UserManager } from './components/UserManager';
import { RoleManager } from './components/RoleManager';
import { LoginScreen } from './components/LoginScreen';
import { SetupScreen } from './components/SetupScreen';
import { ViewState } from './types';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, hasPermission } = useAuth();
  const { isConfigured, loading } = useSettings();
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');

  if (loading) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-slate-900">
              <Loader2 className="animate-spin text-primary-600" size={48} />
          </div>
      );
  }

  // Show Setup Wizard if org not configured
  if (!isConfigured) {
      return <SetupScreen />;
  }

  // Show Login if configured but not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Safe navigation wrapper to check permissions before rendering
  const handleNavigate = (view: ViewState) => {
      if (hasPermission(view)) {
          setCurrentView(view);
      } else {
          alert("You do not have permission to access this view.");
      }
  };

  const renderContent = () => {
    // Double check permission on render
    if (!hasPermission(currentView)) {
        return <div className="p-10 text-center text-gray-500">Access Denied</div>;
    }

    switch (currentView) {
      case 'DASHBOARD': return <Dashboard />;
      case 'PRODUCTION': return <ProductionManager />;
      case 'INVENTORY': return <InventoryManager initialTab="INVENTORY" />;
      case 'MATERIALS': return <InventoryManager initialTab="MATERIALS" />;
      case 'PRODUCTS': return <InventoryManager initialTab="PRODUCTS" />;
      case 'CUSTOMERS': return <CustomerManager />;
      case 'SUPPLIERS': return <SupplierManager />;
      case 'PURCHASE_ORDERS': return <PurchaseOrderManager />;
      case 'SALES_ORDERS': return <SalesOrderManager />;
      case 'EXPENSES': return <ExpenseManager />;
      case 'SALES': return <SalesManager />;
      case 'INVOICES': return <InvoiceManager />;
      case 'EMPLOYEES': return <EmployeeManager />;
      case 'BANKS': return <BankManager />;
      case 'TAXES': return <TaxManager />;
      case 'DEDUCTIONS': return <DeductionManager />;
      case 'PAYROLL': return <PayrollManager />;
      case 'PROFIT_LOSS': return <ProfitLossManager />;
      case 'INCIDENTS': return <IncidentManager />;
      case 'RESOURCES': return <ResourceManager />;
      case 'SETTINGS': return <SettingsManager />;
      case 'USERS': return <UserManager />;
      case 'ROLES': return <RoleManager />;
      default: return <Dashboard />;
    }
  };

  return (
      <Layout currentView={currentView} onNavigate={handleNavigate}>
        {renderContent()}
      </Layout>
  );
}

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <AuthProvider>
          <AppContent />
      </AuthProvider>
    </SettingsProvider>
  );
};

export default App;
