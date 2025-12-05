
import React, { useMemo, useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { db } from '../services/db';
import { 
  Factory, AlertTriangle, DollarSign, AlertCircle, CheckCircle, Loader2, 
  ShoppingBag, ShoppingCart, TrendingUp, Wallet, Filter, Calendar, TrendingDown, Banknote
} from 'lucide-react';
import { 
  Production, IncidentReport, Material, Product, InventoryItem, 
  Sale, Expense, PurchaseOrder, SalesOrder, Payroll
} from '../types';
import { useSettings } from '../contexts/SettingsContext';

const Card: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 dark:bg-slate-800 dark:border-slate-700 hover:shadow-md transition-shadow animate-fade-in">
    <div className={`p-4 rounded-full ${color} text-white shadow-sm`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium dark:text-gray-400">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{value}</h3>
    </div>
  </div>
);

type DateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';

export const Dashboard: React.FC = () => {
  const { formatCurrency, settings } = useSettings();
  
  // Data State
  const [production, setProduction] = useState<Production[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      const [p, i, m, prod, inv, s, e, pay, po, so] = await Promise.all([
        db.getProduction(),
        db.getIncidents(),
        db.getMaterials(),
        db.getProducts(),
        db.getInventory(),
        db.getSales(),
        db.getExpenses(),
        db.getPayroll(),
        db.getPurchaseOrders(),
        db.getSalesOrders()
      ]);
      setProduction(p);
      setIncidents(i);
      setMaterials(m);
      setProducts(prod);
      
      // Safety check for orphaned inventory
      const validInventory = inv.filter(item => prod.some(product => product.id === item.productId));
      setInventory(validInventory);
      
      setSales(s);
      setExpenses(e);
      setPayroll(pay);
      setPurchaseOrders(po);
      setSalesOrders(so);
      
      setLoading(false);
    };
    fetchData();
  }, []);

  // Filter Logic
  const isDateInFilter = (dateStr: string) => {
    if (dateFilter === 'ALL') return true;
    
    const date = new Date(dateStr);
    const now = new Date();
    now.setHours(0,0,0,0);
    
    if (dateFilter === 'TODAY') {
      const todayStr = now.toISOString().split('T')[0];
      return dateStr === todayStr;
    }
    
    if (dateFilter === 'WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
      const monday = new Date(now.setDate(diff));
      monday.setHours(0,0,0,0);
      return date >= monday;
    }
    
    if (dateFilter === 'MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= startOfMonth;
    }

    if (dateFilter === 'QUARTER') {
        const currQuarter = Math.floor(now.getMonth() / 3);
        const startOfQuarter = new Date(now.getFullYear(), currQuarter * 3, 1);
        return date >= startOfQuarter;
    }

    if (dateFilter === 'YEAR') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return date >= startOfYear;
    }

    return true;
  };

  // Calculations
  const filteredProduction = useMemo(() => production.filter(p => isDateInFilter(p.date)), [production, dateFilter]);
  const filteredSales = useMemo(() => sales.filter(s => isDateInFilter(s.date)), [sales, dateFilter]);
  const filteredExpenses = useMemo(() => expenses.filter(e => isDateInFilter(e.date)), [expenses, dateFilter]);
  const filteredPayroll = useMemo(() => payroll.filter(p => isDateInFilter(p.date)), [payroll, dateFilter]);

  // Use generic 'Units' label since we support mixed units now
  const totalProduction = filteredProduction.reduce((acc, curr) => acc + curr.outputTonnage, 0);
  const totalSales = filteredSales.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPurchases = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPayroll = filteredPayroll.reduce((acc, curr) => acc + curr.amountPayable, 0);
  
  const totalExpenses = totalPurchases + totalPayroll;
  const netProfit = totalSales - totalExpenses;
  
  const lowStockCount = inventory.filter(i => i.lowStockThreshold !== undefined && i.quantity <= i.lowStockThreshold).length;
  const totalInventoryValue = inventory.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);

  // Chart Data Preparation
  const chartData = [
      { name: 'Sales', amount: totalSales },
      { name: 'Purchases', amount: totalPurchases },
      { name: 'Payroll', amount: totalPayroll }
  ];
  
  const productionChartData = useMemo(() => {
    return production.slice(-10).map(p => ({
      ...p,
      totalInputTonnage: p.materialsUsed?.reduce((sum, mat) => sum + mat.inputTonnage, 0) || 0
    })).reverse();
  }, [production]);


  // Default to showing everything if settings aren't loaded or config is missing
  const config = settings?.dashboardConfig || {
    showProductionOutput: true,
    showInventoryValue: true,
    showLowStockAlert: true,
    showIncidents: true,
    showTotalSales: true,
    showPurchases: true,
    showPayrollCost: true,
    showNetProfit: true
  };

  if (loading) {
      return (
          <div className="flex h-[50vh] items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={48} />
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
          <div className="flex items-center gap-2 text-gray-600">
              <Filter size={20} />
              <span className="font-medium">Filter Dashboard Data:</span>
          </div>
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              {(['ALL', 'TODAY', 'WEEK', 'MONTH', 'YEAR'] as DateFilter[]).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setDateFilter(filter)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        dateFilter === filter ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                      {filter}
                  </button>
              ))}
          </div>
      </div>

      {/* KPI Grid - Operational */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {config.showProductionOutput && (
            <Card 
            title="Production Output" 
            value={`${totalProduction.toFixed(1)}`} 
            icon={<Factory size={24} />} 
            color="bg-blue-500" 
            />
        )}
        {config.showInventoryValue && (
            <Card 
            title="Inventory Value" 
            value={formatCurrency(totalInventoryValue)} 
            icon={<ShoppingBag size={24} />} 
            color="bg-purple-500" 
            />
        )}
        {config.showLowStockAlert && (
            <Card 
            title="Low Stock Alerts" 
            value={lowStockCount} 
            icon={<AlertTriangle size={24} />} 
            color={lowStockCount > 0 ? "bg-red-500" : "bg-green-500"} 
            />
        )}
        {config.showIncidents && (
            <Card 
            title="Incidents" 
            value={incidents.length} 
            icon={<AlertCircle size={24} />} 
            color={incidents.length > 0 ? "bg-orange-500" : "bg-green-500"} 
            />
        )}
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {config.showTotalSales && (
              <Card 
                title="Total Sales" 
                value={formatCurrency(totalSales)} 
                icon={<TrendingUp size={24} />} 
                color="bg-emerald-500" 
              />
          )}
          {config.showPurchases && (
              <Card 
                title="Total Purchases" 
                value={formatCurrency(totalPurchases)} 
                icon={<ShoppingCart size={24} />} 
                color="bg-indigo-500" 
              />
          )}
          {config.showPayrollCost && (
              <Card 
                title="Payroll Cost" 
                value={formatCurrency(totalPayroll)} 
                icon={<Banknote size={24} />} 
                color="bg-pink-500" 
              />
          )}
          
          {config.showNetProfit && (
              <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 dark:bg-slate-800 dark:border-slate-700 hover:shadow-md transition-shadow animate-fade-in ${netProfit >= 0 ? 'border-b-4 border-b-green-500' : 'border-b-4 border-b-red-500'}`}>
                <div className={`p-4 rounded-full text-white shadow-sm ${netProfit >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                {netProfit >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                </div>
                <div>
                    <p className="text-sm text-gray-500 font-medium dark:text-gray-400">Net Profit / Loss</p>
                    <h3 className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(netProfit)}
                    </h3>
                </div>
              </div>
          )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 dark:bg-slate-800 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-800 mb-6 dark:text-white">Financial Overview</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                    cursor={{fill: 'transparent'}}
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                        <cell key={`cell-${index}`} fill={['#10b981', '#6366f1', '#ec4899'][index]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 dark:bg-slate-800 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-800 mb-6 dark:text-white">Recent Production Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productionChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="outputTonnage" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} name="Output (Qty)" />
                <Line type="monotone" dataKey="totalInputTonnage" stroke="#94a3b8" strokeWidth={2} dot={{r: 4}} name="Input (Tons)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
