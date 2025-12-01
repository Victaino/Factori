
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Sale, Customer, Product, Bank } from '../types';
import { FileText, Mail, Printer, Eye, X, Download, Search } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const InvoiceManager: React.FC = () => {
  const { formatCurrency } = useSettings();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    const fetchData = async () => {
        setSales(await db.getSales());
        setCustomers(await db.getCustomers());
        setProducts(await db.getProducts());
        setBanks(await db.getBanks());
    };
    fetchData();
  }, []);

  const getCustomer = (id: string) => customers.find(c => c.id === id);
  const getProduct = (id: string) => products.find(p => p.id === id);

  const handleViewInvoice = (sale: Sale) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  const handleSendEmail = () => {
    if (!selectedSale) return;
    const customer = getCustomer(selectedSale.customerId);
    const product = getProduct(selectedSale.productId);
    if (!customer || !product) return;

    const subject = `Invoice #${selectedSale.id} - Factori Production`;
    const body = `Dear ${customer.contactPerson},%0D%0A%0D%0APlease find the invoice details below for your recent purchase.%0D%0A%0D%0AInvoice ID: ${selectedSale.id}%0D%0ADate: ${selectedSale.date}%0D%0AProduct: ${product.name}%0D%0AQuantity: ${selectedSale.quantity}%0D%0ATotal Amount: ${formatCurrency(selectedSale.amount)}%0D%0ABalance Due: ${formatCurrency(selectedSale.balance)}%0D%0A%0D%0AKind regards,%0D%0AFactori Accounts Team`;

    window.location.href = `mailto:${customer.email}?subject=${subject}&body=${body}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredInvoices = useMemo(() => {
    return sales.filter(sale => {
      const customer = getCustomer(sale.customerId);
      const customerName = customer?.name.toLowerCase() || '';
      const invoiceId = sale.id.toLowerCase();
      const term = searchTerm.toLowerCase();
      const isPaid = sale.balance === 0;

      const matchesSearch = !term || customerName.includes(term) || invoiceId.includes(term);
      const matchesStatus = filterStatus === 'ALL' || (filterStatus === 'PAID' ? isPaid : !isPaid);

      return matchesSearch && matchesStatus;
    });
  }, [sales, searchTerm, filterStatus, customers]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="text-blue-600" /> Invoices
        </h2>
      </div>

       {/* Filter Toolbar */}
       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search invoice # or customer..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className="border rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
        </select>

        {(searchTerm || filterStatus !== 'ALL') && (
          <button 
            onClick={() => { setSearchTerm(''); setFilterStatus('ALL'); }}
            className="text-gray-500 hover:text-red-500 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
          >
            <X size={16} /> Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Invoice #</th>
              <th className="p-4 font-semibold text-gray-600">Date</th>
              <th className="p-4 font-semibold text-gray-600">Customer</th>
              <th className="p-4 font-semibold text-gray-600">Amount</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredInvoices.map(sale => {
              const customer = getCustomer(sale.customerId);
              const isPaid = sale.balance === 0;
              return (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="p-4 font-mono text-gray-600">#{sale.id}</td>
                  <td className="p-4 text-gray-800">{sale.date}</td>
                  <td className="p-4 text-gray-800 font-medium">{customer?.name || 'Unknown'}</td>
                  <td className="p-4 text-gray-800">{formatCurrency(sale.amount)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {isPaid ? 'PAID' : 'PENDING'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleViewInvoice(sale)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 justify-end w-full"
                    >
                      <Eye size={16} /> View
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredInvoices.length === 0 && (
               <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  {sales.length === 0 ? "No invoices generated." : "No matching invoices found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Modal */}
      {isModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8 relative flex flex-col max-h-[90vh]">
            
            {/* Toolbar */}
            <div className="bg-gray-800 text-white p-4 rounded-t-xl flex justify-between items-center sticky top-0 z-10 print:hidden">
              <h3 className="font-semibold">Invoice Preview</h3>
              <div className="flex items-center gap-3">
                <button onClick={handleSendEmail} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm transition-colors">
                  <Mail size={16} /> Email Customer
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 px-3 py-1.5 rounded text-sm transition-colors">
                  <Printer size={16} /> Print
                </button>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Invoice Content */}
            <div className="p-8 overflow-y-auto" id="printable-invoice">
              
              {/* Header */}
              <div className="flex justify-between items-start mb-8 border-b pb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 tracking-tight">INVOICE</h1>
                  <p className="text-gray-500 mt-1">#{selectedSale.id}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold text-gray-800">Factori Ltd.</h2>
                  <p className="text-sm text-gray-500">123 Industrial Park</p>
                  <p className="text-sm text-gray-500">Manufacturing City, 90210</p>
                  <p className="text-sm text-gray-500">accounts@factori.com</p>
                </div>
              </div>

              {/* Bill To & Details */}
              <div className="flex justify-between mb-8">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To</h3>
                  <div className="text-gray-800">
                    <p className="font-bold text-lg">{getCustomer(selectedSale.customerId)?.name}</p>
                    <p>{getCustomer(selectedSale.customerId)?.contactPerson}</p>
                    <p className="text-gray-500 text-sm whitespace-pre-wrap max-w-xs">{getCustomer(selectedSale.customerId)?.address}</p>
                    <p className="text-gray-500 text-sm">{getCustomer(selectedSale.customerId)?.email}</p>
                  </div>
                </div>
                <div className="text-right">
                   <div className="mb-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Invoice Date</h3>
                    <p className="font-medium text-gray-800">{selectedSale.date}</p>
                   </div>
                   <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Amount Due</h3>
                    <p className={`font-bold text-xl ${selectedSale.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(selectedSale.balance)}
                    </p>
                   </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="mb-8">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-600 text-sm uppercase">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-3 font-medium text-gray-800">{getProduct(selectedSale.productId)?.name}</td>
                      <td className="p-3 text-right text-gray-600">{selectedSale.quantity}</td>
                      <td className="p-3 text-right text-gray-600">{formatCurrency(selectedSale.price)}</td>
                      <td className="p-3 text-right font-semibold text-gray-800">{formatCurrency(selectedSale.amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-8">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedSale.amount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (0%)</span>
                    <span>{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-gray-800 border-t pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(selectedSale.amount)}</span>
                  </div>
                   <div className="flex justify-between text-green-600 text-sm pt-2">
                    <span>Amount Paid</span>
                    <span>-{formatCurrency(selectedSale.paid)}</span>
                  </div>
                   <div className="flex justify-between font-bold text-gray-800 border-t pt-2">
                    <span>Balance Due</span>
                    <span>{formatCurrency(selectedSale.balance)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              {banks.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h3 className="font-bold text-gray-700 mb-2 text-sm">Payment Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <p className="text-gray-400 text-xs">Bank Name</p>
                      <p>{banks[0].name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Sort Code / Routing</p>
                      <p>{banks[0].sortCode}</p>
                    </div>
                     <div className="col-span-2">
                      <p className="text-gray-400 text-xs">Reference</p>
                      <p>INV-{selectedSale.id}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 text-center text-xs text-gray-400 rounded-b-xl print:hidden">
              <p>Thank you for your business!</p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
