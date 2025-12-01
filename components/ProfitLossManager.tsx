
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Sale, Expense, Payroll } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { BarChart4, TrendingUp, TrendingDown, Printer, Calendar, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type DateFilter = 'CUSTOM' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';

export const ProfitLossManager: React.FC = () => {
  const { formatCurrency } = useSettings();
  
  // Data State
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  
  const [activeFilter, setActiveFilter] = useState<DateFilter>('MONTH');
  
  // Helper to calculate date ranges
  const getDateRangeForFilter = (filter: DateFilter) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    if (filter === 'WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      const monday = new Date(now.setDate(diff));
      const endOfWeek = new Date(now.setDate(diff + 6));
      return {
        start: monday.toISOString().split('T')[0],
        end: endOfWeek.toISOString().split('T')[0]
      };
    }
    
    if (filter === 'MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      };
    }
    
    if (filter === 'QUARTER') {
      const currQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), currQuarter * 3, 1);
      const end = new Date(now.getFullYear(), currQuarter * 3 + 3, 0);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      };
    }
    
    if (filter === 'YEAR') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      };
    }

    // Default return (shouldn't be reached for 'CUSTOM' in this logic flow)
    return { start: todayStr, end: todayStr };
  };

  const [dateRange, setDateRange] = useState(getDateRangeForFilter('MONTH'));

  useEffect(() => {
    const fetchData = async () => {
      const [s, e, p] = await Promise.all([
        db.getSales(),
        db.getExpenses(),
        db.getPayroll()
      ]);
      setSales(s);
      setExpenses(e);
      setPayroll(p);
    };
    fetchData();
  }, []);

  // Update dates when filter changes
  useEffect(() => {
    if (activeFilter !== 'CUSTOM') {
      setDateRange(getDateRangeForFilter(activeFilter));
    }
  }, [activeFilter]);

  // Filter Data
  const filteredData = useMemo(() => {
    const filteredSales = sales.filter(s => s.date >= dateRange.start && s.date <= dateRange.end);
    const filteredExpenses = expenses.filter(e => e.date >= dateRange.start && e.date <= dateRange.end);
    const filteredPayroll = payroll.filter(p => p.date >= dateRange.start && p.date <= dateRange.end);
    
    return { filteredSales, filteredExpenses, filteredPayroll };
  }, [sales, expenses, payroll, dateRange]);

  // Calculations
  const totalSales = filteredData.filteredSales.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPurchases = filteredData.filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPayroll = filteredData.filteredPayroll.reduce((acc, curr) => acc + curr.amountPayable, 0);
  
  const totalExpenses = totalPurchases + totalPayroll;
  const netProfit = totalSales - totalExpenses;
  const isProfit = netProfit >= 0;

  // Chart Data
  const chartData = [
    { name: 'Income', amount: totalSales },
    { name: 'Expenses', amount: totalExpenses },
  ];

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:hidden">
        <div>
           <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             <BarChart4 className="text-blue-600" /> Profit & Loss Statement
           </h2>
           <p className="text-gray-500 text-sm">Financial performance summary</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
          {/* Preset Filters */}
          <div className="flex bg-gray-100 p-1 rounded-lg self-start">
            {(['WEEK', 'MONTH', 'QUARTER', 'YEAR'] as DateFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeFilter === f 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
             {/* Custom Date Inputs */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border">
              <Calendar size={16} className="text-gray-400" />
              <input 
                type="date" 
                className="bg-transparent text-sm outline-none text-gray-700 w-32"
                value={dateRange.start}
                onChange={e => {
                  setDateRange({...dateRange, start: e.target.value});
                  setActiveFilter('CUSTOM');
                }}
              />
              <span className="text-gray-400">-</span>
              <input 
                type="date" 
                className="bg-transparent text-sm outline-none text-gray-700 w-32"
                value={dateRange.end}
                onChange={e => {
                  setDateRange({...dateRange, end: e.target.value});
                  setActiveFilter('CUSTOM');
                }}
              />
            </div>
            
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium ml-auto"
            >
              <Printer size={16} /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Report Container */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden print:shadow-none print:border-none">
        {/* Printable Header */}
        <div className="p-8 border-b hidden print:block text-center">
            <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
            <p className="text-gray-600">Period: {dateRange.start} to {dateRange.end}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 md:p-8 bg-gray-50 border-b print:bg-white print:border-none">
          <div className="bg-white p-6 rounded-xl border shadow-sm print:border-gray-300">
             <p className="text-sm font-medium text-gray-500 mb-1">Total Income</p>
             <h3 className="text-2xl font-bold text-green-600">{formatCurrency(totalSales)}</h3>
             <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                <TrendingUp size={14} /> Revenue
             </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border shadow-sm print:border-gray-300">
             <p className="text-sm font-medium text-gray-500 mb-1">Total Expenses</p>
             <h3 className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</h3>
             <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                <TrendingDown size={14} /> Purchases + Payroll
             </div>
          </div>

          <div className={`bg-white p-6 rounded-xl border shadow-sm print:border-gray-300 ${isProfit ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}`}>
             <p className="text-sm font-medium text-gray-500 mb-1">Net Profit / Loss</p>
             <h3 className={`text-2xl font-bold ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
                {isProfit ? '+' : ''}{formatCurrency(netProfit)}
             </h3>
             <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-bold ${isProfit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
               {isProfit ? 'PROFIT' : 'LOSS'}
             </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row print:flex-col">
            {/* Detailed Breakdown Table */}
            <div className="flex-1 p-6 md:p-8">
                <h3 className="font-bold text-gray-800 mb-4 text-lg">Detailed Breakdown</h3>
                
                <div className="space-y-6">
                    {/* Income Section */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">Income</h4>
                        <div className="flex justify-between py-2 text-sm">
                            <span className="text-gray-700">Sales Revenue</span>
                            <span className="font-medium text-gray-900">{formatCurrency(totalSales)}</span>
                        </div>
                        <div className="flex justify-between py-2 bg-gray-50 font-bold border-t">
                            <span>Total Income</span>
                            <span className="text-green-600">{formatCurrency(totalSales)}</span>
                        </div>
                    </div>

                    {/* Expense Section */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">Operating Expenses</h4>
                        <div className="flex justify-between py-2 text-sm border-b border-gray-50">
                            <span className="text-gray-700">Purchases (COGS/Materials)</span>
                            <span className="font-medium text-gray-900">{formatCurrency(totalPurchases)}</span>
                        </div>
                        <div className="flex justify-between py-2 text-sm border-b border-gray-50">
                            <span className="text-gray-700">Payroll & Wages</span>
                            <span className="font-medium text-gray-900">{formatCurrency(totalPayroll)}</span>
                        </div>
                         <div className="flex justify-between py-2 bg-gray-50 font-bold border-t mt-2">
                            <span>Total Operating Expenses</span>
                            <span className="text-red-600">{formatCurrency(totalExpenses)}</span>
                        </div>
                    </div>

                    {/* Net Section */}
                     <div className="pt-4 border-t-2 border-gray-100">
                        <div className="flex justify-between py-3 text-lg font-bold">
                            <span>Net Profit</span>
                            <span className={isProfit ? 'text-green-700' : 'text-red-700'}>
                                {formatCurrency(netProfit)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="w-full lg:w-1/3 bg-gray-50 p-6 md:p-8 border-l print:hidden">
                <h3 className="font-bold text-gray-800 mb-6 text-center">Income vs Expenses</h3>
                <div className="h-64">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{fill: 'transparent'}} />
                            <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
