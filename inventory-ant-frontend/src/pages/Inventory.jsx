import React, { useState, useMemo } from 'react';
import '../App.css';
import { getExpiryInfo, getExpKey } from '../utils/expiryHelpers';

function Inventory({ products, onAddProduct, onDeleteProduct, filterMode, setFilterMode }) {
  const [formData, setFormData] = useState({});

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
      if (!['id', 'userId', 'quantity', 'mrp', 'productId', 'name', 'details', '_headers'].includes(k)) {
          cols.add(k);
      }
    }));
    return Array.from(cols);
  }, [products]);

  const displayProducts = useMemo(() => {
    if (filterMode === 'lowStock') return products.filter(p => parseInt(p.quantity || '0', 10) < 20);
    
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
    { key: 'productId', placeholder: headers.productId.toUpperCase(), className: 'flex-[1_1_120px]' },
    { key: 'name', placeholder: headers.name.toUpperCase(), className: 'flex-[2_1_220px]' },
    { key: 'quantity', placeholder: headers.quantity.toUpperCase(), className: 'flex-[1_1_100px]' },
    { key: 'mrp', placeholder: headers.mrp.toUpperCase(), className: 'flex-[1_1_100px]' },
    { key: 'details', placeholder: 'DETAILS', className: 'flex-[1_1_180px]' },
  ];

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto flex-1">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--glass-border)]">
        <div>
            <h2 className="m-0 text-2xl md:text-3xl font-black text-[var(--text-dark)]">Master <span className="glow-text">Inventory</span></h2>
            <p className="m-0 mt-1 text-[var(--text-muted)] text-xs font-semibold">
              Showing <strong className="text-[var(--text-main)]">{displayProducts.length}</strong> items • Filter: <span className="text-[var(--primary)] font-bold">{filterMode.toUpperCase()}</span>
            </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
            {isFiltered && (
              <button onClick={() => setFilterMode('all')} className="btn-outline !py-1.5 !px-3 !text-xs font-bold whitespace-nowrap">✕ RESET FILTER</button>
            )}
            <button 
              onClick={async () => {
                if(window.confirm("DANGER: This will delete ALL items from your account. Continue?")) {
                  await fetch('http://localhost:3000/products/all', { 
                    method: 'DELETE', 
                    headers: { 'x-user-id': localStorage.getItem('ant_user') } 
                  });
                  window.location.reload(); 
                }
              }}
              className="btn-danger !py-1.5 !px-3 !text-xs font-bold"
            >
              CLEAR ALL DATA
            </button>
            <button onClick={() => window.print()} className="btn-primary !py-1.5 !px-4 !text-xs font-semibold">PRINT REPORT</button>
        </div>
      </div>

      <div className="glass-panel p-6 mb-8">
          <h4 className="m-0 mb-4 text-xs font-bold text-[var(--text-muted)] tracking-wider">QUICK REGISTER</h4>
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-center">
            {standardFields.map(f => (
              <input 
                key={f.key}
                type="text" 
                placeholder={f.placeholder} 
                value={formData[f.key] || ''} 
                onChange={e => setFormData({...formData, [f.key]: e.target.value})} 
                className={`input-field min-w-[100px] ${f.className}`}
              />
            ))}
            {dynamicColumns.filter(c => !['id', 'userId', 'name', 'quantity', 'mrp', 'csv_row', 'productId', 'details', '_timestamp', 'timestamp', '_headers'].includes(c.toLowerCase())).map(col => (
              <input 
                key={col}
                type="text" 
                placeholder={col.toUpperCase()} 
                value={formData[col] || ''} 
                onChange={e => setFormData({...formData, [col]: e.target.value})} 
                className="input-field min-w-[140px] flex-[1_1_140px]"
              />
            ))}
            <button type="submit" className="btn-primary py-3 px-6 text-sm font-bold">ADD ITEM</button>
          </form>
      </div>

      <div className="glass-panel p-0 overflow-hidden border-none bg-transparent shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-[var(--bg-card)]">
              <tr className="border-b border-[var(--glass-border)]">
                <th className="p-4 text-[var(--text-muted)] text-[10px] tracking-wider uppercase font-bold font-mono">ROW</th>
                <th className="p-4 text-xs font-bold tracking-wider text-[var(--text-muted)] uppercase">{headers.name}</th>
                <th className="p-4 text-xs font-bold tracking-wider text-[var(--text-muted)] uppercase">{headers.quantity}</th>
                <th className="p-4 text-xs font-bold tracking-wider text-[var(--text-muted)] uppercase">{headers.mrp}</th>
                {dynamicColumns.filter(c => !['id', 'userId', 'name', 'quantity', 'mrp', 'csv_row', 'productId', '_headers'].includes(c)).map(col => (
                  <th key={col} className="p-4 text-[10px] tracking-wider font-bold text-[var(--text-muted)] uppercase">{col}</th>
                ))}
                <th className="p-4 text-xs font-bold tracking-wider text-[var(--text-muted)] uppercase text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayProducts.map((p, i) => (
                <tr key={p.id} className="border-b border-[var(--glass-border)] hover:bg-[var(--primary-bg)] transition-colors">
                  <td className="p-4 text-[var(--text-muted)] text-[10px] font-mono">#{i + 1}</td>
                  <td className="p-4">
                    <div className="font-bold text-[var(--text-dark)] text-sm md:text-base">{p.name}</div>
                    <div className="text-[10px] text-[var(--primary)] tracking-wider mt-0.5">{headers.productId.toUpperCase()}: {p.productId || 'N/A'}</div>
                    {p.details && <div className="text-xs text-[var(--text-muted)] mt-1">{p.details}</div>}
                  </td>
                  <td className="p-4">
                    <div className={`inline-block px-3 py-1 rounded-md text-xs font-black border ${
                      parseInt(p.quantity) < 20 
                        ? 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]' 
                        : 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]'
                    }`}>
                      {p.quantity}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-[var(--text-dark)] text-sm md:text-base">₹{p.mrp}</td>
                  {dynamicColumns.filter(c => !['id', 'userId', 'name', 'quantity', 'mrp', 'csv_row', 'productId', '_headers'].includes(c)).map(col => {
                    let displayVal = p[col];
                    if (col.toLowerCase().includes('timestamp') || col.toLowerCase().includes('time')) {
                      const ms = parseInt(displayVal, 10);
                      if (!isNaN(ms)) {
                        displayVal = new Date(ms).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
                      }
                    }
                    return (
                      <td key={col} className="p-4 text-[var(--text-muted)] text-xs">{displayVal || '-'}</td>
                    );
                  })}
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => onDeleteProduct(p.id)} 
                      className="btn-danger !py-1 !px-2.5 !text-xs font-semibold"
                    >
                      DELETE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Inventory;
