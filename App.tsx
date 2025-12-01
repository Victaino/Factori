
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
import { ViewState } from './types';
import { SettingsProvider } from './contexts/SettingsContext';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');

  const renderContent = () => {
    switch (currentView) {
      case 'DASHBOARD': return <Dashboard />;
      case 'PRODUCTION': return <ProductionManager />;
      case 'INVENTORY': return <InventoryManager initialTab="INVENTORY" />;
      case 'MATERIALS': return <InventoryManager initialTab="MATERIALS" />; // Keep for compatibility
      case 'PRODUCTS': return <InventoryManager initialTab="PRODUCTS" />;   // Keep for compatibility
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
      default: return <Dashboard />;
    }
  };

  return (
    <SettingsProvider>
      <Layout currentView={currentView} onNavigate={setCurrentView}>
        {renderContent()}
      </Layout>
    </SettingsProvider>
  );
};

export default App;
