import React, { useMemo } from 'react';
import '../App.css';
import { getExpiryInfo, getExpKey } from '../utils/expiryHelpers';
import { Box, AlertTriangle, Layers, BarChart2, TrendingUp } from 'lucide-react';

function Dashboard({ products, userId, onAlertClick, onTotalClick, onOpenScanner, onGoToSettings }) {
  const dynamicColumns = useMemo(() => {
    const cols = new Set();
    products.forEach(p => Object.keys(p).forEach(k => {
      if (!['id', 'userId', 'quantity', 'mrp', 'productId', 'name', 'details'].includes(k)) {
          cols.add(k);
      }
    }));
    return Array.from(cols);
  }, [products]);

  const expKey = getExpKey(dynamicColumns);
  const lowStockCount = products.filter(p => {
    const q = parseInt(p.quantity || '0', 10);
    return !isNaN(q) && q < 20;
  }).length;

  const totalStock = products.reduce((acc, p) => acc + (parseInt(p.quantity || '0', 10) || 0), 0);

  // Chart Logic
  const maxStock = useMemo(() => {
     if (products.length === 0) return 200;
     const max = Math.max(...products.map(p => parseInt(p.quantity || '0', 10) || 0));
     return max < 50 ? 50 : max;
  }, [products]);

  return (
    <div className="p-6 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC]">
      <div className="flex flex-col mb-8">
        <h1 className="m-0 text-3xl font-extrabold tracking-tight text-indigo-600">
          System Overview
        </h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">Warehouse status updates and real-time analytical graphs.</p>
      </div>
      
      {products.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-12 mt-8 flex flex-col items-center text-center max-w-4xl mx-auto shadow-sm">
           <div className="text-6xl mb-4 animate-bounce drop-shadow-sm">👋</div>
           <h2 className="m-0 text-indigo-600 text-2xl font-bold">Welcome to Inventory Ant!</h2>
           <p className="text-slate-500 max-w-[600px] leading-relaxed text-sm mt-3">
             Aapka warehouse abhi khali hai. System ko start karne aur AI ko data dene ke liye, sabse pehle apni Master CSV (Inventory List) file upload karein.
           </p>
           <button 
             onClick={onGoToSettings} 
             className="mt-6 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm border-none cursor-pointer"
           >
             Go to Account Settings ➔
           </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {/* Total SKU Card */}
        <div 
          className="bg-white border border-slate-100 rounded-2xl p-6 flex items-start justify-between cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow" 
          onClick={onTotalClick}
        >
           <div className="flex flex-col">
             <h3 className="text-slate-400 m-0 uppercase text-[10px] tracking-wider font-bold">Total SKU Inventory</h3>
             <p className="text-4xl my-3 font-extrabold text-slate-800">{products.length}</p>
             <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline">
               View all items ➔
             </span>
           </div>
           <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
              <Box size={24} strokeWidth={2} />
           </div>
        </div>
        
        {/* Low Stock Card */}
        <div 
          className={`bg-white border ${lowStockCount > 0 ? 'border-amber-200' : 'border-slate-100'} rounded-2xl p-6 flex items-start justify-between cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow`} 
          onClick={() => onAlertClick('lowStock')}
        >
           <div className="flex flex-col">
             <div className="flex items-center gap-3">
               <h3 className="text-slate-400 m-0 uppercase text-[10px] tracking-wider font-bold">Low Stock Filter</h3>
             </div>
             <div className="flex items-center gap-3 my-3">
                <p className="text-4xl m-0 font-extrabold text-slate-800">{lowStockCount}</p>
                {lowStockCount > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Attention</span>}
             </div>
             <span className="text-xs text-slate-500 font-medium">
               Stocks requiring immediate replenishment.
             </span>
           </div>
           <div className={`w-12 h-12 rounded-2xl ${lowStockCount > 0 ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'} flex items-center justify-center`}>
              <AlertTriangle size={24} strokeWidth={2} />
           </div>
        </div>

        {/* Total Stock Sum Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-start justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow">
          <div className="flex flex-col">
            <h3 className="text-slate-400 m-0 uppercase text-[10px] tracking-wider font-bold">Total Stock Sum</h3>
            <p className="text-4xl my-3 font-extrabold text-slate-800">{totalStock}</p>
            <span className="text-xs text-slate-500 font-medium">
              Total aggregated physical items.
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-500">
              <Layers size={24} strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* Bar Chart Section */}
      {products.length > 0 && (
        <div className="mt-6 bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
           <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                 <BarChart2 size={18} className="text-indigo-400" />
                 <h3 className="m-0 text-slate-700 font-bold text-sm">Stock Availability levels per SKU</h3>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                 <TrendingUp size={12} /> Updated Live
              </div>
           </div>

           {/* Chart Container */}
           <div className="w-full overflow-x-auto pb-8 pt-32">
             <div className="min-w-max pl-24 pr-24">
               <div className="h-64 min-w-[600px] flex items-end gap-2 border-l border-b border-slate-200 pb-2 pl-2 relative mt-4">
                {/* Y Axis labels */}
                <div className="absolute -left-8 bottom-0 flex flex-col justify-between h-full text-[10px] text-slate-400 font-mono py-2">
                   <span>{maxStock}</span>
                   <span>{Math.round(maxStock/2)}</span>
                   <span>0</span>
                </div>
                
                {/* Bars */}
                {products.slice(0, 50).map((p, i) => {
                   const qty = parseInt(p.quantity || '0', 10) || 0;
                   const heightPct = Math.min(100, (qty / maxStock) * 100);
                   return (
                     <div key={p.id || i} className="flex-1 flex flex-col items-center group relative h-full justify-end min-w-[12px]">
                        {/* Enhanced Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl pointer-events-none w-48 z-50 transition-all duration-200 translate-y-2 group-hover:translate-y-0">
                           <div className="font-bold border-b border-slate-700 pb-1.5 mb-1.5 truncate text-sm">{p.name || 'Unnamed Item'}</div>
                           <div className="flex justify-between mb-1"><span>SKU:</span> <span className="font-mono text-slate-300">{p.productId || 'N/A'}</span></div>
                           <div className="flex justify-between mb-1"><span>Stock:</span> <span className="font-bold text-emerald-400">{qty}</span></div>
                           <div className="flex justify-between"><span>MRP:</span> <span>₹{p.mrp || 0}</span></div>
                           {p.details && <div className="text-slate-400 text-[10px] mt-1.5 pt-1.5 border-t border-slate-700 line-clamp-2">{p.details}</div>}
                        </div>
                        <div 
                           className="w-full bg-indigo-500 rounded-t-sm hover:bg-indigo-400 transition-colors"
                           style={{ height: `${heightPct}%`, minHeight: qty > 0 ? '4px' : '0' }}
                        ></div>
                     </div>
                   );
                })}
             </div>
             </div>
           </div>
         </div>
      )}
    </div>
  );
}

export default Dashboard;
