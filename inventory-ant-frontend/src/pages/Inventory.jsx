import { API_BASE_URL } from '../utils/config';
import React, { useState, useMemo } from 'react';
import '../App.css';
import { getExpiryInfo, getExpKey } from '../utils/expiryHelpers';
import { Printer, Trash2, Edit3, Plus, Terminal, Check, X, CheckCircle } from 'lucide-react';

function Inventory({ products, token, onAddProduct, onDeleteProduct, onEditProduct, filterMode, setFilterMode, userRole }) {
  const [formData, setFormData] = useState({});
  const [editingProductId, setEditingProductId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
      mrp: 'MRP'
    };
  }, [products]);

  const dynamicColumns = useMemo(() => {
    const cols = new Set();
    products.forEach(p => Object.keys(p).forEach(k => {
      if (!['id', 'userId', 'quantity', 'mrp', 'productId', 'name', 'details', '_headers', '_timestamp', 'timestamp', 'csv_row'].includes(k)) {
          cols.add(k);
      }
    }));
    return Array.from(cols);
  }, [products]);

  const displayProducts = useMemo(() => {
    if (filterMode === 'lowStock') {
      return products.filter(p => {
        const q = parseInt(p.quantity || '0', 10);
        return !isNaN(q) && q > 0 && q < 20;
      });
    }
    
    if (filterMode === 'outOfStock') {
      return products.filter(p => {
        const q = parseInt(p.quantity || '0', 10);
        return !isNaN(q) && q === 0;
      });
    }
    
    if (filterMode === 'expired' || filterMode === 'expiringSoon') {
      const expKey = getExpKey(dynamicColumns);
      if (!expKey) return products;

      return products.filter(p => {
        const info = getExpiryInfo(p[expKey]);
        return filterMode === 'expired' ? info.status === 'EXPIRED' : info.status === 'EXPIRING SOON';
      });
    }
    return products;
  }, [products, filterMode, dynamicColumns]);

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
    { key: 'mrp', placeholder: headers.mrp.toUpperCase(), className: 'w-24' },
    { key: 'details', placeholder: 'DETAILS', className: 'w-40' },
  ];

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto flex-1 bg-[#F8FAFC]">
       
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
            {isFiltered && (
              <p className="m-0 text-slate-500 text-xs font-semibold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full inline-block">
                Showing {displayProducts.length} items • Filter: {
                  filterMode === 'outOfStock' ? 'OUT OF STOCK' :
                  filterMode === 'lowStock' ? 'LOW STOCK' :
                  filterMode === 'expiringSoon' ? 'EXPIRING SOON' :
                  filterMode.toUpperCase()
                }
              </p>
            )}
        </div>
        <div className="flex flex-wrap gap-3 items-center ml-auto">
            {isFiltered && (
              <button onClick={() => setFilterMode('all')} className="py-2 px-4 text-xs font-bold whitespace-nowrap bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-slate-50 cursor-pointer transition-all shadow-sm">✕ RESET</button>
            )}
            <button onClick={() => window.print()} className="flex items-center gap-2 py-2 px-4 text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full cursor-pointer transition-all shadow-sm">
                <Printer size={14} /> Print Report
            </button>
            {userRole !== 'staff' && (
              <button 
                onClick={async () => {
                  if(window.confirm("DANGER: This will delete ALL items from your account. Continue?")) {
                    await fetch(`${API_BASE_URL}/api/user/products/all`, { 
                      method: 'DELETE', 
                      headers: { 'Authorization': `Bearer ${token}` } 
                    });
                    window.location.reload(); 
                  }
                }}
                className="flex items-center gap-2 py-2 px-4 text-xs font-bold bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 rounded-full cursor-pointer transition-all shadow-sm"
              >
                <Trash2 size={14} /> Clear All Data
              </button>
            )}
        </div>
      </div>

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
        <div className="px-6 py-5 border-b border-slate-100">
           <h3 className="m-0 text-[15px] font-bold text-slate-800">Registered Catalog</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr>
                <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-16">ROW</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase w-24">SKU CODE</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase">{headers.name}</th>
                {dynamicColumns.map(col => (
                  <th key={col} className="px-6 py-4 text-[10px] tracking-wider font-bold text-slate-400 uppercase">{col}</th>
                ))}
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase w-32">AVAILABLE STOCK</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase w-24">MRP (₹)</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase text-right w-24">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayProducts.map((p, i) => (
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
                  
                  <td className="px-6 py-5">
                    {editingProductId === p.id ? (
                      <div className="flex flex-col gap-2">
                        <input 
                          type="text" 
                          value={editFormData.name || ''} 
                          onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                          className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-full"
                          placeholder="Name"
                        />
                        <input 
                          type="text" 
                          value={editFormData.details || ''} 
                          onChange={(e) => setEditFormData({...editFormData, details: e.target.value})}
                          className="bg-slate-50 border border-slate-300 text-slate-800 text-[10px] rounded px-2 py-1 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-full"
                          placeholder="Details"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                        {p.details && <div className="text-xs text-slate-400 mt-1">{p.details}</div>}
                      </>
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
                  
                  <td className="px-6 py-5">
                    {editingProductId === p.id ? (
                      <input 
                        type="number" 
                        value={editFormData.mrp || ''} 
                        onChange={(e) => setEditFormData({...editFormData, mrp: e.target.value})}
                        className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-20"
                      />
                    ) : (
                      <div className="font-bold text-slate-700 text-sm">₹{Number(p.mrp || 0).toFixed(2)}</div>
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
