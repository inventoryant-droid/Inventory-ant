import React, { useMemo } from 'react';
import '../App.css';
import { getExpiryInfo, getExpKey } from '../utils/expiryHelpers';

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

  const { expiredCount, expiringSoonCount } = useMemo(() => {
    if (!expKey) return { expiredCount: 0, expiringSoonCount: 0 };
    let expired = 0;
    let soon = 0;
 
    products.forEach(p => {
      const info = getExpiryInfo(p[expKey]);
      if (info.status === 'EXPIRED') expired++;
      else if (info.status === 'EXPIRING SOON') soon++;
    });

    return { expiredCount: expired, expiringSoonCount: soon };
  }, [products, expKey]);

  const totalStock = products.reduce((acc, p) => acc + (parseInt(p.quantity || '0', 10) || 0), 0);

  return (
    <div className="p-6 md:p-10 flex-1 overflow-y-auto">
      <h1 className="mt-0 text-3xl md:text-5xl font-black tracking-tight mb-8">
        System <span className="glow-text">Overview</span>
      </h1>
      
      {products.length === 0 && (
        <div className="glass-panel bg-[var(--primary-bg)] border-[var(--primary)] p-8 md:p-12 mt-8 flex flex-col items-center text-center max-w-4xl mx-auto">
           <div className="text-6xl mb-4 animate-bounce">👋</div>
           <h2 className="margin-0 text-[var(--primary)] text-2xl md:text-3xl font-bold">Welcome to Inventory Ant!</h2>
           <p className="text-[var(--text-main)] max-w-[600px] leading-relaxed text-base md:text-lg mt-4">
             Aapka warehouse abhi khali hai. System ko start karne aur AI ko data dene ke liye, sabse pehle apni Master CSV (Inventory List) file upload karein.
           </p>
           <button 
             onClick={onGoToSettings} 
             className="btn-primary mt-8 py-4 px-8 text-base font-bold"
           >
             Go to Account Settings ➔
           </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mt-8">
        <div 
          className="card cursor-pointer border border-[var(--primary)] bg-[var(--primary-bg)] p-6 flex flex-col justify-between" 
          onClick={onTotalClick}
        >
           <div>
             <h3 className="text-[var(--text-muted)] m-0 uppercase text-[10px] tracking-[2px] font-bold">Total Inventory</h3>
             <p className="text-4xl md:text-5xl my-2 font-black text-[var(--primary)]">{products.length}</p>
           </div>
           <span className="text-[9px] text-[var(--primary)] font-mono tracking-wider font-bold">[ VIEW ALL ITEMS ]</span>
        </div>
        
        <div 
          className={`card cursor-pointer p-6 flex flex-col justify-between ${
            lowStockCount > 0 
              ? 'border-[var(--danger)] bg-[var(--danger-bg)]' 
              : 'border-[var(--glass-border)]'
          }`} 
          onClick={() => onAlertClick('lowStock')}
        >
           <div>
             <h3 className="text-[var(--text-muted)] m-0 uppercase text-[10px] tracking-[2px] font-bold">Low Stock Filter</h3>
             <p className={`text-4xl md:text-5xl my-2 font-black ${lowStockCount > 0 ? 'text-[var(--danger)]' : 'text-[var(--text-main)]'}`}>{lowStockCount}</p>
           </div>
           <span className={`text-[9px] font-mono tracking-wider font-bold ${lowStockCount > 0 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
             {lowStockCount > 0 ? '[ ALERT ACTIVE ]' : '[ STABLE ]'}
           </span>
        </div>
        
        {expKey && (
          <>
            <div 
              className={`card cursor-pointer p-6 flex flex-col justify-between ${
                expiredCount > 0 
                  ? 'border-[var(--danger)] bg-[var(--danger-bg)]' 
                  : 'border-[var(--glass-border)]'
              }`} 
              onClick={() => onAlertClick('expired')}
            >
               <div>
                 <h3 className="text-[var(--text-muted)] m-0 uppercase text-[10px] tracking-[2px] font-bold">Expired Items</h3>
                 <p className="text-4xl md:text-5xl my-2 font-black text-[var(--danger)]">{expiredCount}</p>
               </div>
               <span className="text-[9px] text-[var(--danger)] font-mono tracking-wider font-bold">[ CRITICAL FILTER ]</span>
            </div>
            <div 
              className={`card cursor-pointer p-6 flex flex-col justify-between ${
                expiringSoonCount > 0 
                  ? 'border-[var(--warning)] bg-[var(--warning-bg)]' 
                  : 'border-[var(--glass-border)]'
              }`} 
              onClick={() => onAlertClick('expiringSoon')}
            >
               <div>
                 <h3 className="text-[var(--text-muted)] m-0 uppercase text-[10px] tracking-[2px] font-bold">Expiring Soon</h3>
                 <p className="text-4xl md:text-5xl my-2 font-black text-[var(--warning)]">{expiringSoonCount}</p>
               </div>
               <span className="text-[9px] text-[var(--warning)] font-mono tracking-wider font-bold">[ WARNING FILTER ]</span>
            </div>
          </>
        )}

        <div className="card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-[var(--text-muted)] m-0 uppercase text-[10px] tracking-[2px] font-bold">Total Stock</h3>
            <p className="text-4xl md:text-5xl my-2 font-black text-[var(--primary)]">{totalStock}</p>
          </div>
          <span className="text-[9px] text-[var(--text-muted)] font-mono tracking-wider font-bold">[ SUM UNITS ]</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          <div className="ai-card text-center p-8 rounded-2xl relative overflow-hidden flex flex-col items-center">
            <div className="scan-line"></div>
            <div className="text-5xl mb-4">⚡</div>
            <h2 className="text-2xl font-bold text-[var(--primary)] mb-2">Inbound</h2>
            <p className="text-[var(--text-muted)] text-sm mb-6 max-w-xs">Add products to stock via bill scanning.</p>
            <button className="btn-primary w-full py-4 text-base font-semibold" onClick={() => onOpenScanner('IN')}>Scan Purchase Bill</button>
         </div>

         <div className="ai-card text-center p-8 rounded-2xl relative overflow-hidden flex flex-col items-center">
            <div className="scan-line bg-[var(--danger)] shadow-[0_0_15px_var(--danger)] [animation-delay:1.5s]"></div>
            <div className="text-5xl mb-4">🔥</div>
            <h2 className="text-2xl font-bold text-[var(--danger)] mb-2">Outbound</h2>
            <p className="text-[var(--text-muted)] text-sm mb-6 max-w-xs">Sell products via receipt deduction.</p>
            <button className="btn-danger w-full py-4 text-base font-semibold" onClick={() => onOpenScanner('OUT')}>Scan Sales Receipt</button>
          </div>
      </div>
    </div>
  );
}

export default Dashboard;
