
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import { db } from '../services/db';
import { Factory, AlertTriangle, Package, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

const Card: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
    <div className={`p-4 rounded-full ${color} text-white`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const production = db.getProduction();
  const incidents = db.getIncidents();
  const materials = db.getMaterials();
  const products = db.getProducts();
  const inventory = db.getInventory();

  const totalOutput = useMemo(() => production.reduce((acc, curr) => acc + curr.outputTonnage, 0).toFixed(1), [production]);
  const incidentCount = incidents.length;
  const materialValue = useMemo(() => materials.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString(), [materials]);
  
  // Low Stock Logic
  const lowStockItems = useMemo(() => {
    return inventory.filter(i => i.lowStockThreshold !== undefined && i.quantity <= i.lowStockThreshold);
  }, [inventory]);

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown Product';
  
  // Prepare chart data: Production by Date
  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    production.forEach(p => {
      grouped[p.date] = (grouped[p.date] || 0) + p.outputTonnage;
    });
    return Object.keys(grouped).map(date => ({ date, output: grouped[date] })).sort((a, b) => a.date.localeCompare(b.date));
  }, [production]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Total Production" value={`${totalOutput} Tons`} icon={<Factory size={24} />} color="bg-blue-600" />
        <Card title="Active Incidents" value={incidentCount} icon={<AlertTriangle size={24} />} color="bg-red-500" />
        <Card title="Material Value" value={`$${materialValue}`} icon={<DollarSign size={24} />} color="bg-green-600" />
        
        {lowStockItems.length > 0 ? (
          <Card 
            title="Low Stock Alerts" 
            value={lowStockItems.length} 
            icon={<AlertCircle size={24} />} 
            color="bg-orange-500" 
          />
        ) : (
          <Card 
            title="Inventory Status" 
            value="OK" 
            icon={<CheckCircle size={24} />} 
            color="bg-emerald-500" 
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section - Takes up 2/3 width on large screens */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Production Output Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis