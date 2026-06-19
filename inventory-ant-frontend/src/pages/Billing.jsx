import React, { useState, useEffect } from 'react';
import '../App.css';
import { Search, ShoppingCart, Check, Plus, Minus } from 'lucide-react';

function Billing({ products, onSaleSuccess, userId, token }) {
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
         const res = await fetch('http://localhost:3000/api/user/products/sell', {
             method: 'POST',
             headers: { 
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`
             },
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
     <div className="p-4 md:p-8 flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 overflow-y-auto bg-[#F8FAFC]">
        <div className="flex-[2] min-w-full lg:min-w-[400px]">
           <h1 className="m-0 text-3xl font-extrabold tracking-tight text-indigo-600 mb-6">
              Sales Terminal
           </h1>
           <div className="relative mt-2">
              <div className="relative">
                 <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                 <input 
                    type="text" 
                    placeholder="Scan or Search Registry..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-4 pl-12 text-sm text-slate-800 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                 />
              </div>
              {searchResults.length > 0 && (
                 <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {searchResults.map(p => (
                       <div 
                         key={p.id} 
                         className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0" 
                         onClick={() => addToCart(p)}
                       >
                          <div>
                             <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                             <div className="text-xs text-slate-500 mt-0.5">ID: {p.productId || '---'}</div>
                          </div>
                          <div className="text-indigo-600 font-bold text-sm">₹{p.mrp}</div>
                       </div>
                    ))}
                 </div>
              )}
           </div>
        </div>
 
        <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex-1 min-w-full lg:min-w-[350px] p-6 flex flex-col justify-between">
           <div>
              <h2 className="m-0 text-slate-800 text-lg font-bold mb-6 flex items-center gap-2">
                 <ShoppingCart size={20} className="text-indigo-500" /> Payload Batch
              </h2>
              <div className="flex flex-col gap-3">
                 {cart.length === 0 ? (
                   <p className="text-slate-500 text-sm italic bg-slate-50 p-4 rounded-xl text-center border border-slate-100">Cart is empty.</p>
                 ) : (
                   cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                         <div className="flex-1 min-w-0 pr-2">
                            <div className="font-bold text-sm text-slate-800 truncate">{item.name}</div>
                            <div className="text-xs text-indigo-600 font-semibold mt-0.5">₹{item.mrp}</div>
                         </div>
                         <div className="flex items-center gap-3">
                            <button onClick={() => updateQty(item.id, -1)} className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-colors shadow-sm">
                               <Minus size={14} />
                            </button>
                            <span className="font-bold text-slate-800 text-sm min-w-[20px] text-center">{item.quantity}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-colors shadow-sm">
                               <Plus size={14} />
                            </button>
                         </div>
                      </div>
                   ))
                 )}
              </div>
           </div>
 
           <div className="border-t border-slate-100 mt-8 pt-6">
              <div className="flex justify-between items-center text-xl font-extrabold text-slate-800">
                 <span>Total:</span>
                 <span className="text-indigo-600">₹{totalAmount.toFixed(2)}</span>
              </div>
              <button 
                className={`w-full mt-6 py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border-none ${cart.length === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-md hover:shadow-lg'}`}
                disabled={cart.length === 0} 
                onClick={handleCheckout}
              >
                <Check size={18} /> Confirm Terminal Sync
              </button>
           </div>
        </div>
     </div>
  );
}

export default Billing;
