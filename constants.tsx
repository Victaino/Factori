
import React from 'react';
import { 
  LayoutDashboard, 
  Factory, 
  Box, 
  AlertTriangle, 
  Users, 
  Settings, 
  Truck, 
  TrendingUp, 
  Wallet, 
  Landmark, 
  UserPlus, 
  FileMinus, 
  Banknote, 
  ChevronDown, 
  ChevronRight, 
  PieChart, 
  FileText, 
  Briefcase,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  Percent,
  BarChart4
} from 'lucide-react';

// Using a recursive structure for navigation
export type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: NavItem[];
};

export const NAV_ITEMS: NavItem[] = [
  { id: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'PRODUCTION', label: 'Production', icon: <Factory size={20} /> },
  { id: 'INVENTORY', label: 'Inventory Log', icon: <Box size={20} /> },
  {
    id: 'PROCUREMENT_GROUP',
    label: 'Procurement',
    icon: <ShoppingBag size={20} />,
    children: [
      { id: 'SUPPLIERS', label: 'Suppliers', icon: <Truck size={18} /> },
      { id: 'PURCHASE_ORDERS', label: 'Purchase Orders', icon: <FileText size={18} /> },
      { id: 'EXPENSES', label: 'Purchases', icon: <Wallet size={18} /> },
    ]
  },
  {
    id: 'SALES_BILLING_GROUP',
    label: 'Sales & Billing',
    icon: <CreditCard size={20} />,
    children: [
      { id: 'SALES', label: 'Sales Log', icon: <TrendingUp size={18} /> },
      { id: 'SALES_ORDERS', label: 'Sales Orders', icon: <ShoppingCart size={18} /> },
      { id: 'INVOICES', label: 'Invoices', icon: <FileText size={18} /> },
      { id: 'CUSTOMERS', label: 'Customers', icon: <Users size={18} /> },
    ]
  },
  { 
    id: 'FINANCE_GROUP', 
    label: 'Finance', 
    icon: <PieChart size={20} />,
    children: [
      { id: 'BANKS', label: 'Banks', icon: <Landmark size={18} /> },
      { id: 'TAXES', label: 'Taxes', icon: <Percent size={18} /> },
      { id: 'PROFIT_LOSS', label: 'Profit & Loss', icon: <BarChart4 size={18} /> },
    ]
  },
  { 
    id: 'HR_GROUP', 
    label: 'HR & Payroll', 
    icon: <Briefcase size={20} />,
    children: [
      { id: 'EMPLOYEES', label: 'Employees', icon: <UserPlus size={18} /> },
      { id: 'PAYROLL', label: 'Payroll', icon: <Banknote size={18} /> },
      { id: 'DEDUCTIONS', label: 'Deductions', icon: <FileMinus size={18} /> },
    ]
  },
  { id: 'RESOURCES', label: 'Resources', icon: <Settings size={20} /> },
  { id: 'INCIDENTS', label: 'Incidents', icon: <AlertTriangle size={20} /> },
  { id: 'SETTINGS', label: 'Settings', icon: <Settings size={20} /> },
];

export const getPageTitle = (viewId: string): string => {
  for (const item of NAV_ITEMS) {
    if (item.id === viewId) return item.label;
    if (item.children) {
      const child = item.children.find(c => c.id === viewId);
      if (child) return child.label;
    }
  }
  return 'Dashboard';
};
