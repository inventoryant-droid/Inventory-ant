import { API_BASE_URL } from '../utils/config';
import React, { useState, useEffect, useMemo } from 'react';
import '../App.css';
import { getExpiryInfo, getExpKey } from '../utils/expiryHelpers';
import { Printer, Trash2, Edit3, Plus, Terminal, Check, X, CheckCircle, Search, History, User, Clock, ArrowRight, Eye, Package, IndianRupee, Info, ChevronDown, ChevronUp, Download } from 'lucide-react';

const parseQty = (qty) => {
  if (!qty) return 0;
  const clean = String(qty).replace(/,/g, '');
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 0 : parsed;
};

function Inventory({ products, token, onAddProduct, onDeleteProduct, onEditProduct, filterMode, setFilterMode, userRole, userProfile }) {
  const [formData, setFormData] = useState({});
  const [editingProductId, setEditingProductId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [expandedProductIds, setExpandedProductIds] = useState(new Set());
  const toggleRowExpand = (productId) => {
    setExpandedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

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
      productId: 'SKU Code',
      name: 'Product Description',
      costPrice: 'Cost Price',
      mrp: 'Selling Price',
      quantity: 'Available Stock'
    };
  }, [products]);

  const dynamicColumns = useMemo(() => {
    const cols = new Set();
    const realProds = products.filter(p => !p._headers);
    realProds.forEach(p => Object.keys(p).forEach(k => {
      // Skip standard fields
      if (['id', 'userId', 'quantity', 'mrp', 'costPrice', 'productId', 'hsnSac', 'name', 'details', '_headers', '_timestamp', 'timestamp', 'csv_row', 'extraAttributes'].includes(k)) return;
      // Skip phantom col_N columns generated from empty Excel trailing cells
      if (/^col_\d+$/.test(k)) return;
      cols.add(k);
    }));
    // Also filter out columns where ALL products have empty/null/undefined values
    return Array.from(cols).filter(col =>
      realProds.some(p => p[col] !== undefined && p[col] !== null && String(p[col]).trim() !== '')
    );
  }, [products]);

  const [searchTerm, setSearchTerm] = useState('');

  const stats = useMemo(() => {
    const realProds = products.filter(p => !p._headers);
    const total = realProds.length;
    const withCostPrice = realProds.filter(p => {
      const val = parseFloat(p.costPrice);
      return p.costPrice && !isNaN(val) && val > 0;
    }).length;
    const missingCostPrice = total - withCostPrice;
    const withSellingPrice = realProds.filter(p => {
      const val = parseFloat(p.mrp);
      return p.mrp && !isNaN(val) && val > 0;
    }).length;
    const missingSellingPrice = total - withSellingPrice;
    return { total, withCostPrice, missingCostPrice, withSellingPrice, missingSellingPrice };
  }, [products]);

  const displayProducts = useMemo(() => {
    // filter out the headers sentinel item first
    const realProds = products.filter(p => !p._headers);
    if (filterMode === 'lowStock') {
      const threshold = userProfile?.lowStockThreshold ?? 20;
      return realProds.filter(p => {
        const q = parseQty(p.quantity);
        return q > 0 && q <= threshold;
      });
    }
    
    if (filterMode === 'outOfStock') {
      return realProds.filter(p => {
        const q = parseQty(p.quantity);
        return q === 0;
      });
    }

    if (filterMode === 'withCostPrice') {
      return realProds.filter(p => {
        const val = parseFloat(p.costPrice);
        return p.costPrice && !isNaN(val) && val > 0;
      });
    }

    if (filterMode === 'missingCostPrice') {
      return realProds.filter(p => {
        const val = parseFloat(p.costPrice);
        return !p.costPrice || isNaN(val) || val <= 0;
      });
    }

    if (filterMode === 'withSellingPrice') {
      return realProds.filter(p => {
        const val = parseFloat(p.mrp);
        return p.mrp && !isNaN(val) && val > 0;
      });
    }

    if (filterMode === 'missingSellingPrice') {
      return realProds.filter(p => {
        const val = parseFloat(p.mrp);
        return !p.mrp || isNaN(val) || val <= 0;
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
  }, [products, filterMode, dynamicColumns, userProfile]);

  // Filter by searchTerm (SKU, Name) & Sort by SKU code ascending
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
    setFormData({}); // Reset the input fields
    setToastMessage(`${payload.name || 'Item'} registered successfully!`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const standardFields = [
    { key: 'productId', placeholder: 'SKU CODE', className: 'w-24' },
    { key: 'name', placeholder: 'PRODUCT DESCRIPTION', className: 'w-48' },
    ...(userRole !== 'staff' ? [{ key: 'costPrice', placeholder: 'COST PRICE', className: 'w-24' }] : []),
    { key: 'mrp', placeholder: 'SELLING PRICE', className: 'w-24' },
    { key: 'quantity', placeholder: 'AVAILABLE STOCK', className: 'w-24' },
  ];

  const handleDownloadCSV = () => {
    const realProds = products.filter(p => !p._headers);
    if (realProds.length === 0) {
      alert("No stock items available to download.");
      return;
    }

    // Sort products by SKU Code (productId) ascending using natural alphanumeric sort
    const sortedProds = [...realProds].sort((a, b) => {
      const valA = String(a.productId || '').trim();
      const valB = String(b.productId || '').trim();
      
      const numA = Number(valA);
      const numB = Number(valB);
      
      if (valA !== '' && valB !== '' && !isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const standardKeys = ['productId', 'name', ...dynamicColumns, 'costPrice', 'mrp', 'quantity'];
    const standardLabels = [
      headers.productId || 'SKU CODE',
      headers.name || 'PRODUCT DESCRIPTION',
      ...dynamicColumns.map(col => col.toUpperCase()),
      headers.costPrice || 'COST PRICE',
      headers.mrp || 'SELLING PRICE',
      headers.quantity || 'AVAILABLE STOCK'
    ];

    let csvContent = '\uFEFF'; // UTF-8 BOM
    
    // Header
    csvContent += standardLabels.map(label => `"${label.replace(/"/g, '""')}"`).join(',') + '\r\n';

    // Rows
    sortedProds.forEach(p => {
      const values = standardKeys.map(key => {
        let val = p[key];
        if (val === undefined || val === null) {
          val = '';
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvContent += values.join(',') + '\r\n';
    });

    const rawBizName = userProfile?.businessName || '';
    const cleanBizName = rawBizName.trim().replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_') || 'Master_Inventory_Stock';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${cleanBizName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto flex-1 bg-[#F8FAFC]">
       
       {/* Master Inventory Header & Actions */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 text-left border-b border-slate-100 pb-4">
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-emerald-600">
             Master Inventory
          </h1>
          <div className="flex flex-wrap gap-3 items-center sm:ml-auto">
             {isFiltered && (
               <button onClick={() => setFilterMode('all')} className="py-2 px-4 text-xs font-bold whitespace-nowrap bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-slate-50 cursor-pointer transition-all shadow-sm">✕ RESET</button>
             )}
             <button onClick={handleDownloadCSV} className="flex items-center gap-2 py-2 px-4 text-xs font-bold bg-[#0f9d63] border border-emerald-600 text-white hover:bg-emerald-700 rounded-full cursor-pointer transition-all shadow-sm">
                 <Download size={14} /> Download CSV
             </button>
             <button onClick={() => window.print()} className="flex items-center gap-2 py-2 px-4 text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full cursor-pointer transition-all shadow-sm">
                 <Printer size={14} /> Print Report
             </button>
          </div>
       </div>
  
       <>
            <div className={`grid grid-cols-2 md:grid-cols-3 ${userRole === 'staff' ? 'lg:grid-cols-3' : 'lg:grid-cols-5'} gap-4 mb-6`}>
              {/* Total Items Card */}
              <div 
                onClick={() => setFilterMode('all')}
                className={`rounded-2xl border p-5 flex items-center gap-4 cursor-pointer transition-all shadow-sm ${filterMode === 'all' || !filterMode ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-100' : 'bg-white border-slate-100 hover:border-emerald-200'}`}
              >
                <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 shrink-0">
                  <Package size={20} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Items</div>
                  <div className="text-2xl font-extrabold text-slate-800">{stats.total}</div>
                </div>
              </div>

              {/* With Cost Price Card - hidden for staff */}
              {userRole !== 'staff' && (
                <div 
                  onClick={() => setFilterMode('withCostPrice')}
                  className={`rounded-2xl border p-5 flex items-center gap-4 cursor-pointer transition-all shadow-sm ${filterMode === 'withCostPrice' ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-100' : 'bg-white border-slate-100 hover:border-emerald-200'}`}
                >
                  <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 shrink-0">
                    <IndianRupee size={20} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">With Cost Price</div>
                    <div className="text-2xl font-extrabold text-slate-800">{stats.withCostPrice}</div>
                  </div>
                </div>
              )}

              {/* Missing Cost Price Card - hidden for staff */}
              {userRole !== 'staff' && (
                <div 
                  onClick={() => setFilterMode('missingCostPrice')}
                  className={`rounded-2xl border p-5 flex items-center gap-4 cursor-pointer transition-all shadow-sm ${filterMode === 'missingCostPrice' ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-100' : 'bg-white border-slate-100 hover:border-amber-200'}`}
                >
                  <div className="bg-amber-100 p-3 rounded-full text-amber-600 shrink-0">
                    <Info size={20} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Missing Cost Price</div>
                    <div className="text-2xl font-extrabold text-slate-800">{stats.missingCostPrice}</div>
                  </div>
                </div>
              )}

              {/* With Selling Price Card */}
              <div 
                onClick={() => setFilterMode('withSellingPrice')}
                className={`rounded-2xl border p-5 flex items-center gap-4 cursor-pointer transition-all shadow-sm ${filterMode === 'withSellingPrice' ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-100' : 'bg-white border-slate-100 hover:border-emerald-200'}`}
              >
                <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 shrink-0">
                  <IndianRupee size={20} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">With Selling Price</div>
                  <div className="text-2xl font-extrabold text-slate-800">{stats.withSellingPrice}</div>
                </div>
              </div>

              {/* Missing Selling Price Card */}
              <div 
                onClick={() => setFilterMode('missingSellingPrice')}
                className={`rounded-2xl border p-5 flex items-center gap-4 cursor-pointer transition-all shadow-sm ${filterMode === 'missingSellingPrice' ? 'bg-rose-50/50 border-rose-400 ring-2 ring-rose-100' : 'bg-white border-slate-100 hover:border-rose-200'}`}
              >
                <div className="bg-rose-100 p-3 rounded-full text-rose-600 shrink-0">
                  <Info size={20} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Missing Selling Price</div>
                  <div className="text-2xl font-extrabold text-slate-800">{stats.missingSellingPrice}</div>
                </div>
              </div>
            </div>

           {isFiltered && (
             <div className="mb-4 text-left">
               <p className="m-0 text-slate-500 text-xs font-semibold bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full inline-block">
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
          <h4 className="m-0 mb-4 text-sm font-bold text-slate-800 flex items-center gap-2 text-left">
            <Plus size={16} className="text-emerald-500" /> Quick Register
          </h4>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row flex-wrap gap-3 items-stretch md:items-center">
            {standardFields.map(f => (
              <input 
                key={f.key}
                type="text" 
                placeholder={f.placeholder} 
                value={formData[f.key] || ''} 
                onChange={e => setFormData({...formData, [f.key]: e.target.value})} 
                className={`bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all w-full md:w-auto flex-1 min-w-[100px]`}
              />
            ))}
            {dynamicColumns.map(col => (
              <input 
                key={col}
                type="text" 
                placeholder={col.toUpperCase()} 
                value={formData[col] || ''} 
                onChange={e => setFormData({...formData, [col]: e.target.value})} 
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all w-full md:w-32 flex-1 md:flex-none min-w-[100px]"
              />
            ))}
            <button type="submit" className="bg-[#0f9d63] hover:bg-emerald-700 text-white border-none py-2.5 px-6 rounded-lg text-xs font-bold cursor-pointer shadow-sm transition-all whitespace-nowrap w-full md:w-auto mt-2 md:mt-0">Add Item</button>
          </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <h3 className="m-0 text-[15px] font-bold text-slate-800">Registered Catalog</h3>
           <div className="relative w-full sm:w-72">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
             <input
               type="text"
               placeholder="Search SKU or Description..."
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 rounded-lg outline-none transition-all placeholder-slate-400"
             />
           </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-normal md:whitespace-nowrap table-fixed md:table-auto">
            <thead>
              <tr className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                <th className="px-3 md:px-6 py-3 md:py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-12 md:w-16 bg-white">ROW</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase w-20 md:w-24 bg-white hidden md:table-cell">{headers.productId || 'SKU CODE'}</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-white">{headers.name || 'PRODUCT DETAILS'}</th>
                {dynamicColumns.map(col => (
                  <th key={col} className="px-6 py-4 text-[10px] tracking-wider font-bold text-slate-400 uppercase bg-white hidden md:table-cell">{col}</th>
                ))}
                {userRole !== 'staff' && <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase w-28 bg-white hidden md:table-cell">{headers.costPrice || 'COST PRICE'} (₹)</th>}
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase w-28 bg-white hidden md:table-cell">{headers.mrp || 'SELLING PRICE'} (₹)</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase w-32 bg-white hidden md:table-cell">{headers.quantity || 'AVAILABLE STOCK'}</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase text-right w-24 bg-white hidden md:table-cell">ACTIONS</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase text-center w-12 bg-white md:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {sortedDisplayProducts.map((p, i) => {
                const isExpanded = expandedProductIds.has(p.id);
                return (
                  <React.Fragment key={p.id}>
                    <tr 
                      onClick={() => { if (window.innerWidth < 768) toggleRowExpand(p.id); }}
                      className={`border-t border-slate-50 hover:bg-slate-50 transition-colors group ${window.innerWidth < 768 ? 'cursor-pointer' : ''}`}
                    >
                      <td className="px-3 md:px-6 py-3.5 md:py-5 text-slate-400 text-xs font-medium">{i + 1}</td>
                      
                      {/* SKU CODE */}
                      <td className="px-3 md:px-6 py-3.5 md:py-5 text-slate-700 text-sm font-bold hidden md:table-cell">
                        {editingProductId === p.id ? (
                          <input 
                            type="text" 
                            value={editFormData.productId || ''} 
                            onChange={(e) => setEditFormData({...editFormData, productId: e.target.value})}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none w-20"
                          />
                        ) : (p.productId || '-')}
                      </td>

                      {/* PRODUCT DESCRIPTION / DETAILS */}
                      <td className="px-3 md:px-6 py-3.5 md:py-5 font-bold text-slate-800 text-sm whitespace-normal max-w-md">
                        {/* Mobile SKU code displayed above product name */}
                        <div className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider mb-0.5 md:hidden">
                          SKU: {p.productId || '-'}
                        </div>
                        {editingProductId === p.id ? (
                          <input 
                            type="text" 
                            value={editFormData.name || ''} 
                            onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none w-full"
                            placeholder="Product Description"
                          />
                        ) : (
                          p.name
                        )}
                      </td>
                      
                      {/* Custom CSV columns (e.g. Details / Pages, Pkg) */}
                      {dynamicColumns.map(col => {
                        let displayValue = p[col];
                        return (
                          <td key={col} className="px-6 py-5 hidden md:table-cell">
                            {editingProductId === p.id ? (
                              <input 
                                type="text" 
                                value={editFormData[col] || ''} 
                                onChange={(e) => setEditFormData({...editFormData, [col]: e.target.value})}
                                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none w-20"
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

                      {/* Cost Price Cell - hidden for staff */}
                      {userRole !== 'staff' && (
                        <td className="px-6 py-5 hidden md:table-cell">
                          {editingProductId === p.id ? (
                            <input 
                              type="text" 
                              value={editFormData.costPrice || ''} 
                              onChange={(e) => setEditFormData({...editFormData, costPrice: e.target.value})}
                              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none w-20"
                            />
                          ) : (() => {
                            const v = parseFloat(p.costPrice);
                            const isSet = p.costPrice && !isNaN(v) && v > 0;
                            return isSet
                              ? <span className="font-semibold text-slate-700">₹{v.toFixed(2)}</span>
                              : <span className="text-xs text-slate-400 italic">Not Set</span>;
                          })()}
                        </td>
                      )}

                      {/* Selling Price / MRP Cell */}
                      <td className="px-6 py-5 hidden md:table-cell">
                        {editingProductId === p.id ? (
                          <input 
                            type="text" 
                            value={editFormData.mrp || ''} 
                            onChange={(e) => setEditFormData({...editFormData, mrp: e.target.value})}
                            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none w-20"
                          />
                        ) : (() => {
                          const v = parseFloat(p.mrp);
                          const isSet = p.mrp && !isNaN(v) && v > 0;
                          return isSet
                            ? <span className="font-semibold text-slate-700">₹{v.toFixed(2)}</span>
                            : <span className="text-xs text-slate-400 italic">Not Set</span>;
                        })()}
                      </td>

                      {/* Available Stock Cell */}
                      <td className="px-6 py-5 hidden md:table-cell">
                        {editingProductId === p.id ? (
                          <input 
                            type="number" 
                            value={editFormData.quantity || ''} 
                            onChange={(e) => setEditFormData({...editFormData, quantity: e.target.value})}
                            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none w-20"
                          />
                        ) : (() => {
                          const q = parseQty(p.quantity);
                          return (
                            <div className={`font-bold text-sm ${q === 0 ? 'text-red-600 font-extrabold' : 'text-slate-700'}`}>
                              {p.quantity}
                            </div>
                          );
                        })()}
                      </td>
                      
                      {/* Actions Cell */}
                      <td className="px-6 py-5 text-right hidden md:table-cell">
                        {editingProductId === p.id ? (
                          <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                            <button onClick={handleSaveEdit} className="bg-white border border-emerald-200 text-emerald-500 hover:text-white hover:bg-emerald-500 cursor-pointer p-1.5 rounded-md transition-colors shadow-sm">
                              <Check size={16} strokeWidth={3} />
                            </button>
                            <button onClick={handleCancelEdit} className="bg-white border border-slate-200 text-slate-400 hover:text-white hover:bg-slate-400 cursor-pointer p-1.5 rounded-md transition-colors shadow-sm">
                              <X size={16} strokeWidth={3} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleEditClick(p)} className="bg-transparent border-none text-[#0f9d63] hover:text-emerald-700 font-bold text-xs cursor-pointer hover:underline">
                              Edit
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

                      {/* Arrow Indicator Cell (mobile only) */}
                      <td className="px-3 md:px-6 py-3.5 md:py-5 text-center md:hidden">
                        <div className="text-indigo-600 flex justify-center">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </td>
                    </tr>

                    {/* Mobile Expandable Row Details */}
                    {isExpanded && (
                      <tr className="md:hidden bg-slate-50/50 border-t border-slate-100">
                        <td colSpan="3" className="px-3 py-4">
                          <div className="flex flex-col gap-3 text-left">
                            {dynamicColumns.map(col => (
                              <div key={col} className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-400 uppercase">{col}:</span>
                                {editingProductId === p.id ? (
                                  <input 
                                    type="text" 
                                    value={editFormData[col] || ''} 
                                    onChange={(e) => setEditFormData({...editFormData, [col]: e.target.value})}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-indigo-500 w-24"
                                  />
                                ) : (
                                  <span className="font-semibold text-slate-700">{p[col] || '-'}</span>
                                )}
                              </div>
                            ))}
                            {/* Cost Price mobile row - hidden for staff */}
                            {userRole !== 'staff' && (
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-400 uppercase">Cost Price:</span>
                                {editingProductId === p.id ? (
                                  <input 
                                    type="text" 
                                    value={editFormData.costPrice || ''} 
                                    onChange={(e) => setEditFormData({...editFormData, costPrice: e.target.value})}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-indigo-500 w-24"
                                  />
                                ) : (() => {
                                  const cv = parseFloat(p.costPrice);
                                  return p.costPrice && !isNaN(cv) && cv > 0
                                    ? <span className="font-bold text-slate-800">₹{cv.toFixed(2)}</span>
                                    : <span className="text-xs text-slate-400 italic">Not Set</span>;
                                })()}
                              </div>
                            )}
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-400 uppercase">Selling Price:</span>
                              {editingProductId === p.id ? (
                                <input 
                                  type="text" 
                                  value={editFormData.mrp || ''} 
                                  onChange={(e) => setEditFormData({...editFormData, mrp: e.target.value})}
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-indigo-500 w-24"
                                />
                              ) : (() => {
                                const mv = parseFloat(p.mrp);
                                return p.mrp && !isNaN(mv) && mv > 0
                                  ? <span className="font-bold text-slate-800">₹{mv.toFixed(2)}</span>
                                  : <span className="text-xs text-slate-400 italic">Not Set</span>;
                              })()}
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-400 uppercase">Available Stock:</span>
                              {editingProductId === p.id ? (
                                <input 
                                  type="number" 
                                  value={editFormData.quantity || ''} 
                                  onChange={(e) => setEditFormData({...editFormData, quantity: e.target.value})}
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-indigo-500 w-24"
                                />
                              ) : (
                                <span className="font-bold text-slate-800">{p.quantity}</span>
                              )}
                            </div>
                            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
                              <span className="font-bold text-slate-400 uppercase">Actions:</span>
                              {editingProductId === p.id ? (
                                <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={handleSaveEdit} className="bg-white border border-emerald-200 text-emerald-500 hover:text-white hover:bg-emerald-500 cursor-pointer p-1.5 rounded-md transition-colors shadow-sm">
                                    <Check size={16} strokeWidth={3} />
                                  </button>
                                  <button onClick={handleCancelEdit} className="bg-white border border-slate-200 text-slate-400 hover:text-white hover:bg-slate-400 cursor-pointer p-1.5 rounded-md transition-colors shadow-sm">
                                    <X size={16} strokeWidth={3} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-4" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => { handleEditClick(p); }} className="bg-transparent border-none text-indigo-500 hover:text-indigo-700 cursor-pointer p-1">
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
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
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
 
       {/* Beautiful Toast Notification */}
       <div className={`fixed bottom-6 right-1/2 translate-x-1/2 z-50 transition-all duration-300 transform ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
         <div className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex items-center gap-3 border border-slate-700/50 backdrop-blur-md">
           <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-full">
             <CheckCircle size={18} />
           </div>
           <span className="text-sm font-bold tracking-wide">{toastMessage}</span>
         </div>
       </div>

      {/* Hidden print-only layout container */}
      <div id="print-catalog-section">
        <div style={{ textAlign: 'center', marginBottom: '25px', borderBottom: '2px solid #334155', paddingBottom: '15px' }}>
          <h1 style={{ margin: '0 0 5px 0', fontSize: '24px', color: '#0f172a', fontWeight: '800' }}>
            {userProfile?.businessName || 'Warehouse'}
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Master Inventory Stock Report
          </p>
          <div style={{ marginTop: '10px', fontSize: '10px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>Generated: {new Date().toLocaleString()}</span>
            <span>Total Items: {sortedDisplayProducts.length}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>Row</th>
              <th>SKU Code</th>
              <th>Product Description</th>
              {dynamicColumns.map(col => (
                <th key={col}>{col.toUpperCase()}</th>
              ))}
              {userRole !== 'staff' && <th>Cost Price (₹)</th>}
              <th>Selling Price (₹)</th>
              <th>Available Stock</th>
            </tr>
          </thead>
          <tbody>
            {sortedDisplayProducts.map((p, i) => (
              <tr key={p.id}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td>{p.productId || '-'}</td>
                <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                {dynamicColumns.map(col => (
                  <td key={col}>{p[col] || '-'}</td>
                ))}
                {userRole !== 'staff' && (
                  <td>
                    {p.costPrice ? `₹${parseFloat(p.costPrice).toFixed(2)}` : 'Not Set'}
                  </td>
                )}
                <td>
                  {p.mrp ? `₹${parseFloat(p.mrp).toFixed(2)}` : 'Not Set'}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{p.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        #print-catalog-section {
          display: none;
        }
        @media print {
          /* Hide EVERYTHING else */
          body * {
            visibility: hidden !important;
          }
          /* Show print section only */
          #print-catalog-section, #print-catalog-section * {
            visibility: visible !important;
          }
          #print-catalog-section {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 10px;
            color: #000000 !important;
            background: #ffffff !important;
            font-family: system-ui, -apple-system, sans-serif;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 700;
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            font-size: 11px;
            text-transform: uppercase;
          }
          td {
            border: 1px solid #e2e8f0;
            padding: 8px 10px;
            font-size: 11px;
            color: #334155;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}} />
    </div>
  );
}

export default Inventory;
