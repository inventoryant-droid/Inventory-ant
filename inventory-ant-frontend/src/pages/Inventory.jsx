import { API_BASE_URL } from '../utils/config';
import React, { useState, useEffect, useMemo } from 'react';
import '../App.css';
import { getExpiryInfo, getExpKey } from '../utils/expiryHelpers';
import { Printer, Trash2, Edit3, Plus, Terminal, Check, X, CheckCircle, Search, History, User, Clock, ArrowRight, Eye } from 'lucide-react';

function Inventory({ products, token, onAddProduct, onDeleteProduct, onEditProduct, filterMode, setFilterMode, userRole }) {
  const [formData, setFormData] = useState({});
  const [editingProductId, setEditingProductId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // History Log States
  const [activeSubTab, setActiveSubTab] = useState('catalog'); // 'catalog' or 'history'
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const getLogSourceInfo = (details) => {
    const text = (details || '').toLowerCase();
    if (text.includes('inbound scanner')) {
      return { name: 'Inbound Scanner', badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-100' };
    }
    if (text.includes('outbound scanner')) {
      return { name: 'Outbound Scanner', badgeClass: 'bg-rose-50 text-rose-700 border border-rose-100' };
    }
    if (text.includes('sales terminal') || text.includes('billing') || text.includes('sold via')) {
      return { name: 'Billing Terminal', badgeClass: 'bg-amber-50 text-amber-700 border border-amber-100' };
    }
    if (text.includes('voice command') || text.includes('smart scanner / voice')) {
      return { name: 'Voice Assistant', badgeClass: 'bg-purple-50 text-purple-700 border border-purple-100' };
    }
    if (text.includes('bulk import') || text.includes('csv file')) {
      return { name: 'CSV Import', badgeClass: 'bg-blue-50 text-blue-700 border border-blue-100' };
    }
    if (text.includes('quick register') || text.includes('manual registration')) {
      return { name: 'Manual Register', badgeClass: 'bg-slate-50 text-slate-700 border border-slate-200' };
    }
    if (text.includes('manual delete')) {
      return { name: 'Manual Delete', badgeClass: 'bg-slate-50 text-slate-700 border border-slate-200' };
    }
    return { name: 'Manual Update', badgeClass: 'bg-slate-50 text-slate-700 border border-slate-200' };
  };

  const fetchHistory = async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/products/history`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        console.log("HISTORY API RESPONSE DATA:", data);
        if (Array.isArray(data)) {
          console.log("HISTORY API SETTING LOGS, length:", data.length);
          setHistoryLogs(data);
        } else {
          console.log("HISTORY API DATA IS NOT ARRAY");
        }
      } else {
        console.log("HISTORY API FAILED", res.status);
      }
    } catch (e) {
      console.error('Failed to fetch history logs:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'history') {
      fetchHistory();
    }
  }, [activeSubTab, token, products]);

  const handleEditClick = (p) => {
    setEditingProductId(p.id);
    setEditFormData(p);
  };

  const handleSaveEdit = () => {
    if (onEditProduct) {
      onEditProduct(editingProductId, editFormData);
    }
    setEditingProductId(null);
    setToastMessage(`${editFormData.name || 'Item'} updated successfully!`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
  };

  const headers = useMemo(() => {
    const found = products.find(p => p._headers);
    if (found && found._headers) {
      return typeof found._headers === 'string' ? JSON.parse(found._headers) : found._headers;
    }
    return {
      productId: 'Code',
      name: 'Item Name / Category',
      quantity: 'Available Stock',
      mrp: 'MRP',
      details: 'Details'
    };
  }, [products]);

  const dynamicColumns = useMemo(() => {
    const cols = new Set();
    products.forEach(p => Object.keys(p).forEach(k => {
      if (!['id', 'userId', 'quantity', 'mrp', 'costPrice', 'productId', 'name', 'details', '_headers', '_timestamp', 'timestamp', 'csv_row', 'extraAttributes'].includes(k)) {
          cols.add(k);
      }
    }));
    return Array.from(cols);
  }, [products]);

  const [searchTerm, setSearchTerm] = useState('');

  const displayProducts = useMemo(() => {
    // filter out the headers sentinel item first
    const realProds = products.filter(p => !p._headers);
    if (filterMode === 'lowStock') {
      return realProds.filter(p => {
        const q = parseInt(p.quantity || '0', 10);
        return !isNaN(q) && q > 0 && q < 20;
      });
    }
    
    if (filterMode === 'outOfStock') {
      return realProds.filter(p => {
        const q = parseInt(p.quantity || '0', 10);
        return !isNaN(q) && q === 0;
      });
    }
    
    if (filterMode === 'expired' || filterMode === 'expiringSoon') {
      const expKey = getExpKey(dynamicColumns);
      if (!expKey) return realProds;

      return realProds.filter(p => {
        const info = getExpiryInfo(p[expKey]);
        return filterMode === 'expired' ? info.status === 'EXPIRED' : info.status === 'EXPIRING SOON';
      });
    }
    return realProds;
  }, [products, filterMode, dynamicColumns]);

  // Filter by searchTerm (SKU & Name only) & Sort by SKU code ascending
  const sortedDisplayProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const matched = term
      ? displayProducts.filter(p =>
          (p.name || '').toLowerCase().includes(term) ||
          (p.productId || '').toLowerCase().includes(term)
        )
      : displayProducts;

    return [...matched].sort((a, b) => {
      const skuA = (a.productId || '').toString().trim();
      const skuB = (b.productId || '').toString().trim();
      if (!skuA && !skuB) return 0;
      if (!skuA) return 1;
      if (!skuB) return -1;
      // Natural sort: numeric SKUs sort numerically
      const numA = parseFloat(skuA);
      const numB = parseFloat(skuB);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return skuA.localeCompare(skuB, undefined, { sensitivity: 'base' });
    });
  }, [displayProducts, searchTerm]);

  const isFiltered = filterMode && filterMode !== 'all';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    const payload = {
      _timestamp: Date.now(),
      ...formData
    };
    onAddProduct(payload);
  };

  const standardFields = [
    { key: 'productId', placeholder: headers.productId.toUpperCase(), className: 'w-24' },
    { key: 'name', placeholder: headers.name.toUpperCase(), className: 'w-48' },
    { key: 'quantity', placeholder: headers.quantity.toUpperCase(), className: 'w-24' },
    { key: 'details', placeholder: 'DETAILS', className: 'w-40' },
  ];

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto flex-1 bg-[#F8FAFC]">
       
       {/* Master Inventory Header & Actions */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 text-left border-b border-slate-100 pb-4">
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-indigo-600">
             Master Inventory
          </h1>
          <div className="flex flex-wrap gap-3 items-center sm:ml-auto">
             {activeSubTab === 'catalog' ? (
                <>
                   {isFiltered && (
                     <button onClick={() => setFilterMode('all')} className="py-2 px-4 text-xs font-bold whitespace-nowrap bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-slate-50 cursor-pointer transition-all shadow-sm">✕ RESET</button>
                   )}
                   <button onClick={() => window.print()} className="flex items-center gap-2 py-2 px-4 text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full cursor-pointer transition-all shadow-sm">
                       <Printer size={14} /> Print Report
                   </button>
                   <button 
                     onClick={() => setActiveSubTab('history')}
                     className="flex items-center gap-2 py-2 px-4 text-xs font-bold bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 rounded-full cursor-pointer transition-all shadow-sm"
                   >
                     <History size={14} /> View History Logs
                   </button>
                </>
             ) : (
                <button 
                  onClick={() => setActiveSubTab('catalog')}
                  className="flex items-center gap-2 py-2 px-4 text-xs font-bold bg-indigo-600 border border-indigo-600 text-white hover:bg-indigo-700 rounded-full cursor-pointer transition-all shadow-sm"
                >
                  <ArrowRight size={14} className="rotate-180" /> Back to Catalog
                </button>
             )}
          </div>
       </div>
 
       {activeSubTab === 'catalog' ? (
         <>
           {isFiltered && (
             <div className="mb-4 text-left">
               <p className="m-0 text-slate-500 text-xs font-semibold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full inline-block">
                 Showing {displayProducts.length} items • Filter: {
                   filterMode === 'outOfStock' ? 'OUT OF STOCK' :
                   filterMode === 'lowStock' ? 'LOW STOCK' :
                   filterMode === 'expiringSoon' ? 'EXPIRING SOON' :
                   filterMode.toUpperCase()
                 }
               </p>
             </div>
           )}

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] mb-8">
          <h4 className="m-0 mb-4 text-sm font-bold text-slate-800 flex items-center gap-2">
            <Plus size={16} className="text-indigo-500" /> Quick Register
          </h4>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row flex-wrap gap-3 items-stretch md:items-center">
            {standardFields.map(f => (
              <input 
                key={f.key}
                type="text" 
                placeholder={f.placeholder} 
                value={formData[f.key] || ''} 
                onChange={e => setFormData({...formData, [f.key]: e.target.value})} 
                className={`bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all w-full md:w-auto flex-1 min-w-[100px]`}
              />
            ))}
            {dynamicColumns.map(col => (
              <input 
                key={col}
                type="text" 
                placeholder={col.toUpperCase()} 
                value={formData[col] || ''} 
                onChange={e => setFormData({...formData, [col]: e.target.value})} 
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all w-full md:w-32 flex-1 md:flex-none min-w-[100px]"
              />
            ))}
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white border-none py-2.5 px-6 rounded-lg text-xs font-bold cursor-pointer shadow-sm transition-all whitespace-nowrap w-full md:w-auto mt-2 md:mt-0">ADD ITEM</button>
          </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <h3 className="m-0 text-[15px] font-bold text-slate-800">Registered Catalog</h3>
           <div className="relative w-full sm:w-72">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
             <input
               type="text"
               placeholder="Search SKU or Name..."
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 rounded-lg outline-none transition-all placeholder-slate-400"
             />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr>
                <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-16">ROW</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase w-24">SKU CODE</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase">{headers.name}</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase">{headers.details || 'DETAILS'}</th>
                {dynamicColumns.map(col => (
                  <th key={col} className="px-6 py-4 text-[10px] tracking-wider font-bold text-slate-400 uppercase">{col}</th>
                ))}
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase w-32">AVAILABLE STOCK</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase text-right w-24">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {sortedDisplayProducts.map((p, i) => (
                <tr key={p.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-5 text-slate-400 text-xs font-medium">{i + 1}</td>
                  
                  <td className="px-6 py-5 text-slate-700 text-sm font-bold">
                    {editingProductId === p.id ? (
                      <input 
                        type="text" 
                        value={editFormData.productId || ''} 
                        onChange={(e) => setEditFormData({...editFormData, productId: e.target.value})}
                        className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-20"
                      />
                    ) : (p.productId || '-')}
                  </td>
                  
                  <td className="px-6 py-5 font-bold text-slate-800 text-sm">
                    {editingProductId === p.id ? (
                      <input 
                        type="text" 
                        value={editFormData.name || ''} 
                        onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                        className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-full"
                        placeholder="Name"
                      />
                    ) : (
                      p.name
                    )}
                  </td>

                  <td className="px-6 py-5 text-slate-600 text-xs font-semibold">
                    {editingProductId === p.id ? (
                      <input 
                        type="text" 
                        value={editFormData.details || ''} 
                        onChange={(e) => setEditFormData({...editFormData, details: e.target.value})}
                        className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-full"
                        placeholder="Details"
                      />
                    ) : (
                      p.details || <span className="text-slate-300">-</span>
                    )}
                  </td>
                  
                  {/* Custom CSV columns (e.g. Details / Pages, Pkg) */}
                  {dynamicColumns.map(col => {
                    let displayValue = p[col];
                    return (
                      <td key={col} className="px-6 py-5">
                        {editingProductId === p.id ? (
                          <input 
                            type="text" 
                            value={editFormData[col] || ''} 
                            onChange={(e) => setEditFormData({...editFormData, [col]: e.target.value})}
                            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-20"
                          />
                        ) : (
                          displayValue ? (
                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[11px] font-bold">
                              {displayValue}
                            </span>
                          ) : <span className="text-slate-300">-</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="px-6 py-5">
                    {editingProductId === p.id ? (
                      <input 
                        type="number" 
                        value={editFormData.quantity || ''} 
                        onChange={(e) => setEditFormData({...editFormData, quantity: e.target.value})}
                        className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-20"
                      />
                    ) : (
                      <div className="font-bold text-slate-700 text-sm">{p.quantity}</div>
                    )}
                  </td>
                  
                  <td className="px-6 py-5 text-right">
                    {editingProductId === p.id ? (
                      <div className="flex justify-end gap-3">
                        <button onClick={handleSaveEdit} className="bg-white border border-emerald-200 text-emerald-500 hover:text-white hover:bg-emerald-500 cursor-pointer p-1.5 rounded-md transition-colors shadow-sm">
                          <Check size={16} strokeWidth={3} />
                        </button>
                        <button onClick={handleCancelEdit} className="bg-white border border-slate-200 text-slate-400 hover:text-white hover:bg-slate-400 cursor-pointer p-1.5 rounded-md transition-colors shadow-sm">
                          <X size={16} strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditClick(p)} className="bg-transparent border-none text-indigo-500 hover:text-indigo-700 cursor-pointer p-1">
                           <Edit3 size={16} />
                        </button>
                        {userRole !== 'staff' && (
                          <button 
                            onClick={() => onDeleteProduct(p.id)} 
                            className="bg-transparent border-none text-red-400 hover:text-red-600 cursor-pointer p-1"
                          >
                             <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {displayProducts.length === 0 && (
                 <tr>
                    <td colSpan="10" className="px-6 py-12 text-center text-slate-400 text-sm">
                       No products found in the catalog.
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
         </>
             ) : (
          /* History Log Panel */
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden text-left animate-in fade-in duration-200">
             <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="m-0 text-[15px] font-bold text-slate-800 flex items-center gap-2">
                   <History size={16} className="text-indigo-500" /> Audit Log History
                </h3>
                {/* History Search */}
                <div className="relative w-full sm:w-64">
                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                   <input 
                      type="text" 
                      placeholder="Search Logs..." 
                      value={historySearch} 
                      onChange={e => setHistorySearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition-all placeholder-slate-400"
                   />
                </div>
             </div>
 
             <div className="overflow-x-auto">
                {historyLoading ? (
                   <div className="px-6 py-12 text-center text-slate-400 text-sm">
                      Loading history logs...
                   </div>
                ) : (() => {
                   const filteredLogs = historyLogs.filter(log => {
                      const term = historySearch.toLowerCase();
                      return (
                         (log.productName || '').toLowerCase().includes(term) ||
                         (log.productId || '').toLowerCase().includes(term) ||
                         (log.operatorName || '').toLowerCase().includes(term) ||
                         (log.actionType || '').toLowerCase().includes(term) ||
                         (log.details || '').toLowerCase().includes(term)
                      );
                   });
 
                   if (filteredLogs.length === 0) {
                      return (
                         <div className="px-6 py-12 text-center text-slate-400 text-sm">
                            No logs found matching your filters.
                         </div>
                      );
                   }
 
                   return (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                         <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                               <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-48">Timestamp</th>
                               <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold">Product</th>
                               <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-32">Action</th>
                               <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-36">Stock Change</th>
                               <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-32">Operator</th>
                               <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-40">Source</th>
                               <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold">Details</th>
                               <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold text-right w-24">Actions</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                            {filteredLogs.map((log) => {
                               let actionBadge = 'bg-slate-100 text-slate-700';
                               if (log.actionType === 'CREATE' || log.actionType === 'STOCK_IN') {
                                  actionBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                               } else if (log.actionType === 'DELETE' || log.actionType === 'STOCK_OUT') {
                                  actionBadge = 'bg-rose-50 text-rose-700 border border-rose-100';
                               } else if (log.actionType === 'UPDATE') {
                                  actionBadge = 'bg-blue-50 text-blue-700 border border-blue-100';
                               } else if (log.actionType === 'BULK_IMPORT') {
                                  actionBadge = 'bg-amber-50 text-amber-700 border border-amber-100';
                               }
 
                               const dateStr = new Date(log.timestamp).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                               });
                               const sourceInfo = getLogSourceInfo(log.details);
 
                               return (
                                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                     <td className="px-6 py-4.5 text-xs text-slate-500 font-medium">
                                        <span className="flex items-center gap-1.5"><Clock size={12} className="text-slate-400" /> {dateStr}</span>
                                     </td>
                                     <td className="px-6 py-4.5 text-left">
                                        <div className="font-bold text-slate-800 text-xs">{log.productName}</div>
                                        {log.productId && <div className="text-[10px] text-slate-400 mt-0.5">SKU: {log.productId}</div>}
                                     </td>
                                     <td className="px-6 py-4.5">
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${actionBadge}`}>
                                           {log.actionType}
                                        </span>
                                     </td>
                                     <td className="px-6 py-4.5 font-mono text-xs text-slate-600 font-bold">
                                        {log.beforeQty !== null && log.afterQty !== null ? (
                                           <span className="flex items-center gap-1">
                                              {log.beforeQty} <ArrowRight size={10} className="text-slate-400" /> {log.afterQty}
                                           </span>
                                        ) : '-'}
                                     </td>
                                     <td className="px-6 py-4.5 text-xs font-bold text-slate-600">
                                        <span className="flex items-center gap-1.5"><User size={12} className="text-slate-400" /> {log.operatorName}</span>
                                     </td>
                                     <td className="px-6 py-4.5 text-xs font-bold">
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${sourceInfo.badgeClass}`}>
                                           {sourceInfo.name}
                                        </span>
                                     </td>
                                     <td className="px-6 py-4.5 text-xs text-slate-500 whitespace-normal max-w-xs font-medium">
                                        {log.details || '-'}
                                     </td>
                                     <td className="px-6 py-4.5 text-right">
                                        <button
                                           onClick={() => setSelectedLog(log)}
                                           className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-none rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 inline-flex"
                                           title="View Details"
                                        >
                                           <Eye size={12} /> Details
                                        </button>
                                     </td>
                                  </tr>
                               );
                            })}
                         </tbody>
                      </table>
                   );
                })()}
             </div>
          </div>
        )}
 
       {/* Premium Detail Log Modal */}
       {selectedLog && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[1000] p-4 font-sans">
           <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-[550px] border border-slate-100 relative shadow-2xl text-left animate-in fade-in zoom-in-95 duration-200">
             {/* Close button */}
             <button 
               onClick={() => setSelectedLog(null)} 
               className="absolute top-6 right-6 bg-slate-100 hover:bg-slate-200 border-none rounded-full w-8 h-8 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
             >
               <X size={18} />
             </button>
 
             {/* Header */}
             <h2 className="m-0 flex items-center gap-2 text-slate-800 text-xl font-extrabold tracking-tight mb-2">
               <History className="text-indigo-500" size={22} /> Audit Log Details
             </h2>
             <p className="text-xs text-slate-400 font-mono mb-6">LOG ID: {selectedLog.id}</p>
 
             <div className="flex flex-col gap-6">
               {/* Product Info Block */}
               <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
                 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Product Details</div>
                 <div className="font-extrabold text-slate-800 text-base">{selectedLog.productName}</div>
                 {selectedLog.productId && (
                   <div className="text-xs text-indigo-600 font-bold mt-1 bg-indigo-50/50 px-2 py-0.5 rounded-md inline-block">
                     SKU Code: {selectedLog.productId}
                   </div>
                 )}
               </div>
 
               {/* Grid Metadata */}
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80">
                   <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Action Type</div>
                   <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider inline-block mt-1 ${
                     selectedLog.actionType === 'CREATE' || selectedLog.actionType === 'STOCK_IN' 
                       ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                       : selectedLog.actionType === 'DELETE' || selectedLog.actionType === 'STOCK_OUT'
                       ? 'bg-rose-50 text-rose-700 border border-rose-100'
                       : selectedLog.actionType === 'UPDATE'
                       ? 'bg-blue-50 text-blue-700 border border-blue-100'
                       : 'bg-amber-50 text-amber-700 border border-amber-100'
                   }`}>
                     {selectedLog.actionType}
                   </span>
                 </div>
 
                 <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80">
                   <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Channel / Source</div>
                   <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider inline-block mt-1 ${
                     getLogSourceInfo(selectedLog.details).badgeClass
                   }`}>
                     {getLogSourceInfo(selectedLog.details).name}
                   </span>
                 </div>
 
                 <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80">
                   <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1"><Clock size={11} /> Timestamp</div>
                   <div className="text-xs text-slate-700 font-bold">
                     {new Date(selectedLog.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                     })}
                   </div>
                 </div>
 
                 <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80">
                   <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1"><User size={11} /> Operator</div>
                   <div className="text-xs text-slate-700 font-extrabold">{selectedLog.operatorName}</div>
                 </div>
               </div>
 
               {/* Stock Quantity Change Block */}
               <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
                 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3">Inventory Change</div>
                 {selectedLog.beforeQty !== null && selectedLog.afterQty !== null ? (
                   <div className="flex items-center gap-6 justify-center py-2">
                     <div className="text-center">
                       <div className="text-[10px] text-slate-400 font-bold mb-1">Before</div>
                       <div className="text-2xl font-black text-slate-400">{selectedLog.beforeQty}</div>
                     </div>
                     <ArrowRight size={20} className="text-slate-300" />
                     <div className="text-center">
                       <div className="text-[10px] text-slate-400 font-bold mb-1">After</div>
                       <div className="text-2xl font-black text-indigo-600">{selectedLog.afterQty}</div>
                     </div>
 
                     <div className="border-l border-slate-200 pl-6 ml-2">
                       <div className="text-[10px] text-slate-400 font-bold mb-1">Difference</div>
                       {(() => {
                         const diff = parseInt(selectedLog.afterQty, 10) - parseInt(selectedLog.beforeQty, 10);
                         if (diff > 0) {
                           return <div className="text-lg font-extrabold text-emerald-600">+{diff} (Stock In)</div>;
                         } else if (diff < 0) {
                           return <div className="text-lg font-extrabold text-rose-600">{diff} (Stock Out)</div>;
                         } else {
                           return <div className="text-lg font-extrabold text-slate-500">0 (No Change)</div>;
                         }
                       })()}
                     </div>
                   </div>
                 ) : (
                   <div className="text-xs text-slate-500 font-bold py-2 text-center">No Stock Quantity Recorded</div>
                 )}
               </div>
 
               {/* Detailed Explanation */}
               <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
                 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Description / Changes Logged</div>
                 <div className="text-xs text-slate-600 leading-relaxed font-semibold">
                   {selectedLog.details || 'No detailed change description recorded.'}
                 </div>
               </div>
             </div>
 
             {/* Footer close button */}
             <div className="flex gap-3 mt-8">
                <button 
                   className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 px-6 flex-1 text-sm font-bold cursor-pointer border-none shadow-sm transition-colors text-center" 
                   onClick={() => setSelectedLog(null)}
                >
                   Close
                </button>
             </div>
           </div>
         </div>
       )}
 
       {/* Beautiful Toast Notification */}
       <div className={`fixed bottom-6 right-1/2 translate-x-1/2 z-50 transition-all duration-300 transform ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
         <div className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex items-center gap-3 border border-slate-700/50 backdrop-blur-md">
           <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-full">
             <CheckCircle size={18} />
           </div>
           <span className="text-sm font-bold tracking-wide">{toastMessage}</span>
         </div>
       </div>
    </div>
  );
}

export default Inventory;
