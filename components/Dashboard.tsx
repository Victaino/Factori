
import React, { useMemo, useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { db } from '../services/db';
import { 
  Factory, AlertTriangle, DollarSign, AlertCircle, CheckCircle, Loader2, 
  ShoppingBag, ShoppingCart, TrendingUp, Wallet, Filter, Calendar
} from 'lucide-react';
import { 
  Production, IncidentReport, Material, Product, InventoryItem, 
  Sale, Expense, PurchaseOrder, SalesOrder 
} from '../types';
import { useSettings } from '../contexts/SettingsContext';

const Card: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 dark:bg-slate-800 dark:border-slate-700 hover:shadow-md transition-shadow">
    <div className={`p-4 rounded-full ${color} text-white`}>
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
  const { formatCurrency } = useSettings();
  
  // Data State
  const [production, setProduction] = useState<Production[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      const [p, i, m, prod, inv, s, e, po, so] = await Promise.all([
        db.getProduction(),
        db.getIncidents(),
        db.getMaterials(),
        db.getProducts(),
        db.getInventory(),
        db.getSales(),
        db.getExpenses(),
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
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      return date >= startOfQuarter;
    }
    
    if (dateFilter === 'YEAR') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return date >= startOfYear;
    }
    
    return true;
  };

  // Filtered Data
  const filteredProduction = useMemo(() => production.filter(i => isDateInFilter(i.date)), [production, dateFilter]);
  const filteredSales = useMemo(() => sales.filter(i => isDateInFilter(i.date)), [sales, dateFilter]);
  const filteredExpenses = useMemo(() => expenses.filter(i => isDateInFilter(i.date)), [expenses, dateFilter]);
  const filteredPurchaseOrders = useMemo(() => purchaseOrders.filter(i => isDateInFilter(i.orderDate)), [purchaseOrders, dateFilter]);
  const filteredSalesOrders = useMemo(() => salesOrders.filter(i => isDateInFilter(i.orderDate)), [salesOrders, dateFilter]);
  
  // Note: Inventory and Materials are usually snapshots of *current* state, so we generally don't filter them by transaction date unless we track history.
  // We will display current values for these.

  // KPI Calculations
  const totalProduction = filteredProduction.reduce((acc, curr) => acc + curr.outputTonnage, 0).toFixed(1);
  const totalSales = filteredSales.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPurchases = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalSalesOrders = filteredSalesOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalPurchaseOrders = filteredPurchaseOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);
  
  // Snapshot Calculations
  const materialValue = useMemo(() => materials.reduce((acc, curr) => acc + curr.amount, 0), [materials]);
  const productValue = useMemo(() => inventory.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0), [inventory]);
  
  const incidentCount = incidents.length; // Active incidents usually just count total active

  const lowStockItems = useMemo(() => {
    return inventory.filter(i => i.lowStockThreshold !== undefined && i.quantity <= i.lowStockThreshold);
  }, [inventory]);

  // Chart Data: Production Trend (Filtered)
  const lineChartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredProduction.forEach(p => {
      grouped[p.date] = (grouped[p.date] || 0) + p.outputTonnage;
    });
    return Object.keys(grouped).sort().map(date => ({ date, output: grouped[date] }));
  }, [filteredProduction]);

  // Chart Data: Inventory Value by Product (Snapshot)
  const barChartData = useMemo(() => {
    return products.map(p => {
       // Find inventory for this product
       const invItem = inventory.find(i => i.productId === p.id);
       const value = invItem ? invItem.quantity * invItem.price : 0;
       return {
         name: p.name,
         value: value
       };
    }).sort((a,b) => b.value - a.value).slice(0, 10); // Top 10 products
  }, [products, inventory]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 dark:bg-slate-800 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 sm:mb-0 flex items-center gap-2">
           <Filter size={20} className="text-blue-600" /> Dashboard Overview
        </h2>
        <div className="flex space-x-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {(['ALL', 'TODAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'] as DateFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                dateFilter === filter 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
              }`}
            >
              {filter === 'ALL' ? 'All Time' : filter.charAt(0) + filter.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Financial & Order KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          title="Total Sales" 
          value={formatCurrency(totalSales)} 
          icon={<TrendingUp size={24} />} 
          color="bg-green-600" 
        />
        <Card 
          title="Total Purchases" 
          value={formatCurrency(totalPurchases)} 
          icon={<Wallet size={24} />} 
          color="bg-purple-600" 
        />
        <Card 
          title="Sales Orders" 
          value={formatCurrency(totalSalesOrders)} 
          icon={<ShoppingCart size={24} />} 
          color="bg-blue-500" 
        />
        <Card 
          title="Purchase Orders" 
          value={formatCurrency(totalPurchaseOrders)} 
          icon={<ShoppingBag size={24} />} 
          color="bg-emerald-600" 
        />
      </div>

      {/* Operational KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          title="Production Output" 
          value={`${totalProduction} Tons`} 
          icon={<Factory size={24} />} 
          color="bg-indigo-600" 
        />
         <Card 
          title="Product Value" 
          value={formatCurrency(productValue)} 
          icon={<CheckCircle size={24} />} 
          color="bg-teal-600" 
        />
         <Card 
          title="Material Value" 
          value={formatCurrency(materialValue)} 
          icon={<DollarSign size={24} />} 
          color="bg-cyan-600" 
        />
        {lowStockItems.length > 0 ? (
          <Card 
            title="Low Stock Alerts" 
            value={lowStockItems.length} 
            icon={<AlertCircle size={24} />} 
            color="bg-orange-500" 
          />
        ) : (
          <Card 
            title="Active Incidents" 
            value={incidentCount} 
            icon={<AlertTriangle size={24} />} 
            color="bg-red-500" 
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart: Production Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col dark:bg-slate-800 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-800 mb-4 dark:text-white flex justify-between">
            <span>Production Output Trend</span>
            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded dark:bg-slate-700 dark:text-gray-300">
              {dateFilter === 'ALL' ? 'All Time' : `This ${dateFilter.toLowerCase()}`}
            </span>
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1f2937' }}
                />
                <Legend />
                <Line type="monotone" dataKey="output" name="Output (Tons)" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Inventory Value */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col dark:bg-slate-800 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-800 mb-4 dark:text-white">Top Products by Value</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 5, right: 0, bottom: 5, left: -20 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 10}} />
                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} />
                <Tooltip 
                   cursor={{ fill: '#f3f4f6' }}
                   contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                   formatter={(value: any) => formatCurrency(value)}
                />
                <Bar dataKey="value" name="Value" fill="#0d9488" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Recent Incidents Quick View */}
      {incidents.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 dark:bg-slate-800 dark:border-slate-700">
           <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 dark:text-white">
             <AlertTriangle className="text-red-500" size={20} /> Recent Incidents
           </h3>
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
               <thead className="bg-red-50 text-red-800">
                 <tr>
                   <th className="p-3 rounded-l-lg">Date</th>
                   <th className="p-3">Description</th>
                   <th className="p-3 rounded-r-lg">Resolution</th>
                 </tr>
               </thead>
               <tbody className="divide-y dark:divide-slate-700">
                 {incidents.slice(0, 5).map(inc => (
                   <tr key={inc.id}>
                     <td className="p-3 text-gray-600 dark:text-gray-300">{inc.date}</td>
                     <td className="p-3 font-medium text-gray-800 dark:text-white">{inc.description}</td>
                     <td className="p-3 text-gray-600 dark:text-gray-300">{inc.remark}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}
    </div>
  );
};
