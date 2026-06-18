import React, { useState, useEffect } from 'react';
import '../App.css';

function Billing({ products, onSaleSuccess, userId }) {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
     if (searchTerm.trim().length > 0) {
        const filtered = products.filter(p => 
            p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.productId && p.productId.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setSearchResults(filtered);
     } else {
        setSearchResults([]);
     }
  }, [searchTerm, products]);

  const addToCart = (product) => {
     const exists = cart.find(item => item.id === product.id);
     if (exists) {
        setCart(cart.map(item => item.id === product.id ? {...item, quantity: item.quantity + 1} : item));
     } else {
        setCart([...cart, {...product, quantity: 1}]);
     }
     setSearchTerm('');
  };

  const updateQty = (id, delta) => {
     setCart(cart.map(item => item.id === id ? {...item, quantity: Math.max(1, item.quantity + delta)} : item));
  };

  const handleCheckout = async () => {
     if (cart.length === 0) return;
     try {
        const res = await fetch('http://localhost:3000/products/sell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify(cart.map(item => ({ id: item.id, quantity: item.quantity })))
        });
        if (res.ok) {
           setCart([]);
           onSaleSuccess();
        }
     } catch (e) {}
  };

  const totalAmount = cart.reduce((acc, item) => acc + (parseFloat(item.mrp || 0) * item.quantity), 0);

  return (
     <div className="p-6 md:p-10 flex-1 flex flex-col lg:flex-row gap-8 overflow-y-auto">
        <div className="flex-[2] min-w-full lg:min-w-[400px]">
           <h1 className="mt-0 text-3xl md:text-5xl font-black">Sales <span className="glow-text">Terminal</span></h1>
           <div className="relative mt-6">
              <input 
                 type="text" 
                 placeholder="Scan or Search Registry..." 
                 value={searchTerm} 
                 onChange={e => setSearchTerm(e.target.value)}
                 className="input-field w-full p-4 text-lg rounded-2xl"
              />
              {searchResults.length > 0 && (
                 <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                    {searchResults.map(p => (
                       <div 
                         key={p.id} 
                         className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--primary-bg)] transition-colors border-b border-[var(--glass-border)] last:border-b-0" 
                         onClick={() => addToCart(p)}
                       >
                          <div>
                             <div className="font-bold text-[var(--text-dark)]">{p.name}</div>
                             <div className="text-xs text-[var(--text-muted)]">ID: {p.productId || '---'}</div>
                          </div>
                          <div className="text-[var(--primary)] font-bold">₹{p.mrp}</div>
                       </div>
                    ))}
                 </div>
              )}
           </div>
        </div>
 
        <div className="glass-panel flex-1 min-w-full lg:min-w-[350px] p-6 md:p-8 flex flex-col justify-between">
           <div>
              <h2 className="mt-0 text-[var(--primary)] text-xl font-bold mb-6">Payload Batch</h2>
              <div className="flex flex-col gap-3">
                 {cart.length === 0 ? (
                   <p className="text-[var(--text-muted)] text-sm italic">Cart is empty.</p>
                 ) : (
                   cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-[var(--bg-page)] border border-[var(--glass-border)] rounded-xl">
                         <div className="flex-1 min-w-0 pr-2">
                            <div className="font-semibold text-sm text-[var(--text-dark)] truncate">{item.name}</div>
                            <div className="text-xs text-[var(--text-muted)]">₹{item.mrp}</div>
                         </div>
                         <div className="flex items-center gap-3">
                            <button onClick={() => updateQty(item.id, -1)} className="btn-primary !p-1 !h-8 !w-8 flex items-center justify-center text-sm font-bold">-</button>
                            <span className="font-bold text-[var(--text-dark)] text-sm">{item.quantity}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="btn-primary !p-1 !h-8 !w-8 flex items-center justify-center text-sm font-bold">+</button>
                         </div>
                      </div>
                   ))
                 )}
              </div>
           </div>
 
           <div className="border-t border-[var(--glass-border)] mt-8 pt-6">
              <div className="flex justify-between items-center text-2xl font-black text-[var(--text-dark)]">
                 <span>Total:</span>
                 <span className="glow-text">₹{totalAmount}</span>
              </div>
              <button 
                className="btn-primary w-full mt-6 py-4 text-base font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={cart.length === 0} 
                onClick={handleCheckout}
              >
                Confirm Terminal Sync
              </button>
           </div>
        </div>
     </div>
  );
}

export default Billing;
