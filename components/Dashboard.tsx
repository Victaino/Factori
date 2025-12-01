
import React, { useMemo, useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { db } from '../services/db';
import { Factory, AlertTriangle, DollarSign, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Production, IncidentReport, Material, Product, InventoryItem } from '../types';

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
  const [production, setProduction] = useState<Production[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [p, i, m, prod, inv] = await Promise.all([
        db.getProduction(),
        db.getIncidents(),
        db.getMaterials(),
        db.getProducts(),
        db.getInventory()
      ]);
      setProduction(p);
      setIncidents(i);
      setMaterials(m);
      setProducts(prod);
      setInventory(inv);
      setLoading(false);
    };
    fetchData();
  }, []);

  const totalOutput = useMemo(() => production.reduce((acc, curr) => acc + curr.outputTonnage, 0).toFixed(1), [production]);
  const incidentCount = incidents.length;
  const materialValue = useMemo(() => materials.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString(), [materials]);
  
  // Low Stock Logic
  const lowStockItems = useMemo(() => {
    return inventory.filter(i => i.lowStockThreshold !== undefined && i.quantity <= i.lowStockThreshold);
  }, [inventory]);

  // Chart Data: Production Trend
  const lineChartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    production.forEach(p => {
      grouped[p.date] = (grouped[p.date] || 0) + p.outputTonnage;
    });
    // Sort by date
    return Object.keys(grouped).sort().map(date => ({ date, output: grouped[date] }));
  }, [production]);

  // Chart Data: Inventory Value by Product
  const barChartData = useMemo(() => {
    return products.map(p => ({
      name: p.name,
      value: p.amount
    }));
  }, [products]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
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
        {/* Line Chart: Production Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Production Output Trend</h3>
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
                <Line type="monotone" dataKey="output" name="Output (Tons)" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Product Value */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Inventory Value</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <Tooltip 
                   cursor={{ fill: '#f3f4f6' }}
                   contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" name="Value ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Recent Incidents Quick View */}
      {incidents.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
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
               <tbody className="divide-y">
                 {incidents.slice(0, 5).map(inc => (
                   <tr key={inc.id}>
                     <td className="p-3 text-gray-600">{inc.date}</td>
                     <td className="p-3 font-medium text-gray-800">{inc.description}</td>
                     <td className="p-3 text-gray-600">{inc.remark}</td>
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
