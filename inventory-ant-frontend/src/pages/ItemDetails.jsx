import { API_BASE_URL } from '../utils/config';
import React, { useState, useMemo } from 'react';
import '../App.css';
import { Search, Tag, Edit3, Check, X, CheckCircle, Package, IndianRupee, Info } from 'lucide-react';

function ItemDetails({ products, token, onEditProduct }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'withPrice' | 'missing'

  const showSuccessToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleEditClick = (p) => {
    setEditingId(p.id);
    setEditPrice(p.costPrice || '');
    setEditDetails(p.details || '');
  };

  const handleSave = async (p) => {
    if (onEditProduct) {
      await onEditProduct(p.id, { ...p, costPrice: editPrice, details: editDetails });
    }
    setEditingId(null);
    showSuccessToast(`${p.name || 'Item'} updated successfully!`);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  // Filter out the _headers sentinel item
  const realProducts = useMemo(() => products.filter(p => !p._headers), [products]);

  const totalItems = realProducts.length;
  const itemsWithPrice = realProducts.filter(p => {
    const val = parseFloat(p.costPrice);
    return p.costPrice && !isNaN(val) && val > 0;
  }).length;
  const itemsWithoutPrice = totalItems - itemsWithPrice;

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    
    // 1. Search term match (SKU and Name only - no details/description matching)
    let matched = term 
      ? realProducts.filter(p =>
          (p.name || '').toLowerCase().includes(term) ||
          (p.productId || '').toLowerCase().includes(term)
        )
      : realProducts;

    // 2. Active filter logic
    if (activeFilter === 'missing') {
      matched = matched.filter(p => {
        const val = parseFloat(p.costPrice);
        return !p.costPrice || isNaN(val) || val <= 0;
      });
    } else if (activeFilter === 'withPrice') {
      matched = matched.filter(p => {
        const val = parseFloat(p.costPrice);
        return p.costPrice && !isNaN(val) && val > 0;
      });
    }

    // 3. Sort by SKU code ascending
    return [...matched].sort((a, b) => {
      const skuA = (a.productId || '').toString().trim();
      const skuB = (b.productId || '').toString().trim();
      if (!skuA && !skuB) return 0;
      if (!skuA) return 1;
      if (!skuB) return -1;
      const numA = parseFloat(skuA);
      const numB = parseFloat(skuB);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return skuA.localeCompare(skuB, undefined, { sensitivity: 'base' });
    });
  }, [realProducts, searchTerm, activeFilter]);

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
        <div>
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-indigo-600">Item Details</h1>
          <p className="text-slate-500 text-sm font-medium mt-1 m-0">
            Purchase cost prices &amp; item information. Auto-synced from CSV imports &amp; Inbound Scanner.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Total Items Card */}
        <div 
          onClick={() => setActiveFilter('all')}
          className={`rounded-2xl border p-5 flex items-center gap-4 cursor-pointer transition-all shadow-sm ${activeFilter === 'all' ? 'bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-100' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
        >
          <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
            <Package size={20} />
          </div>
          <div className="text-left">
            <div className="text-2xl font-extrabold text-slate-800">{totalItems}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Items</div>
          </div>
        </div>

        {/* With Cost Price Card */}
        <div 
          onClick={() => setActiveFilter('withPrice')}
          className={`rounded-2xl border p-5 flex items-center gap-4 cursor-pointer transition-all shadow-sm ${activeFilter === 'withPrice' ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-100' : 'bg-white border-slate-100 hover:border-emerald-200'}`}
        >
          <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
            <IndianRupee size={20} />
          </div>
          <div className="text-left">
            <div className="text-2xl font-extrabold text-slate-800">{itemsWithPrice}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">With Cost Price</div>
          </div>
        </div>

        {/* Missing Price Card */}
        <div 
          onClick={() => setActiveFilter('missing')}
          className={`rounded-2xl border p-5 flex items-center gap-4 cursor-pointer transition-all shadow-sm ${activeFilter === 'missing' ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-100' : 'bg-white border-slate-100 hover:border-amber-200'}`}
        >
          <div className="bg-amber-100 p-3 rounded-xl text-amber-600">
            <Info size={20} />
          </div>
          <div className="text-left">
            <div className="text-2xl font-extrabold text-slate-800">{itemsWithoutPrice}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Missing Price</div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-start gap-3 text-left">
        <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-600 font-medium m-0">
          Cost Price is what your business paid to purchase the item. It is auto-updated when you inbound scan or bulk import via CSV.
          You can also manually edit it here. This data is only visible to the owner and authorized staff.
        </p>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="m-0 text-[15px] font-bold text-slate-800 flex items-center gap-2">
            <Tag size={16} className="text-indigo-500" /> Item Catalog
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search by SKU or Name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 rounded-lg outline-none transition-all placeholder-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-12">#</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase w-28">SKU Code</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Product Name</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Details / Description</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase w-36">Cost Price (₹)</th>
                <th className="px-6 py-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p, i) => (
                <tr key={p.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-slate-400 text-xs font-medium">{i + 1}</td>

                  {/* SKU Code */}
                  <td className="px-6 py-4">
                    {p.productId ? (
                      <span className="bg-indigo-50 text-indigo-600 text-[11px] font-bold px-2.5 py-1 rounded-lg font-mono">
                        {p.productId}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Name */}
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 text-sm">{p.name || '—'}</div>
                  </td>

                  {/* Details */}
                  <td className="px-6 py-4 text-slate-500 text-xs font-medium max-w-xs">
                    {editingId === p.id ? (
                      <input
                        type="text"
                        value={editDetails}
                        onChange={e => setEditDetails(e.target.value)}
                        className="bg-white border border-indigo-200 text-slate-800 text-xs rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none w-full"
                        placeholder="Item details..."
                      />
                    ) : (
                      <span className="whitespace-normal leading-relaxed">{p.details || <span className="text-slate-300">—</span>}</span>
                    )}
                  </td>

                  {/* Cost Price */}
                  <td className="px-6 py-4">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          className="bg-white border border-indigo-200 text-indigo-700 text-sm font-bold rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none w-24"
                          placeholder="0.00"
                          autoFocus
                        />
                      </div>
                    ) : (
                      p.costPrice && parseFloat(p.costPrice) > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-emerald-600 text-sm">₹{Number(p.costPrice).toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-500 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Not Set</span>
                      )
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    {editingId === p.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSave(p)}
                          className="bg-white border border-emerald-200 text-emerald-500 hover:text-white hover:bg-emerald-500 cursor-pointer p-1.5 rounded-md transition-colors shadow-sm"
                          title="Save"
                        >
                          <Check size={16} strokeWidth={3} />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="bg-white border border-slate-200 text-slate-400 hover:text-white hover:bg-slate-400 cursor-pointer p-1.5 rounded-md transition-colors shadow-sm"
                          title="Cancel"
                        >
                          <X size={16} strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditClick(p)}
                          className="bg-transparent border-none text-indigo-500 hover:text-indigo-700 cursor-pointer p-1"
                          title="Edit cost price"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Tag size={28} className="text-slate-200" />
                      <p className="text-slate-400 text-sm font-medium m-0">
                        {searchTerm ? `No items found for "${searchTerm}"` : 'No items in catalog yet. Add items via Master Inventory or CSV import.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
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

export default ItemDetails;
