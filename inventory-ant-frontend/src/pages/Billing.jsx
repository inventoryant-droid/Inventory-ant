import { API_BASE_URL } from '../utils/config';
import React, { useState, useEffect } from 'react';
import '../App.css';
import { Search, ShoppingCart, Check, Plus, Minus, Printer, X, Receipt, Trash2, AlertTriangle, Download, Send, Share2 } from 'lucide-react';

// Helper to extract all detail descriptions (including dynamic CSV columns) for display
const getProductDetailsText = (p) => {
  if (!p) return '';
  const parts = [];
  if (p.details) {
    parts.push(p.details);
  }
  const standardKeys = ['id', 'userId', 'quantity', 'mrp', 'costPrice', 'productId', 'name', 'details', '_headers', '_timestamp', 'timestamp', 'csv_row', 'extraAttributes', 'availableStock', 'manualPrice'];
  Object.keys(p).forEach(k => {
    if (!standardKeys.includes(k) && p[k] !== undefined && p[k] !== null && String(p[k]).trim() !== '') {
      parts.push(`${k}: ${p[k]}`);
    }
  });
  return parts.join(' | ');
};

function Billing({ products, onSaleSuccess, userId, token, userProfile }) {
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal' or 'history'
  const [cart, setCart] = useState(() => {
    try {
      const uid = userId || localStorage.getItem('ant_user') || 'default';
      const saved = localStorage.getItem(`ant_cart_${uid}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [lastBill, setLastBill] = useState(null);
  const [bills, setBills] = useState([]);

  const saveAndSetCart = (newCart) => {
    setCart(newCart);
    try {
      const uid = userId || localStorage.getItem('ant_user') || 'default';
      localStorage.setItem(`ant_cart_${uid}`, JSON.stringify(newCart));
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }
  };

  useEffect(() => {
    try {
      const uid = userId || localStorage.getItem('ant_user') || 'default';
      const saved = localStorage.getItem(`ant_cart_${uid}`);
      setCart(saved ? JSON.parse(saved) : []);
    } catch (e) {
      setCart([]);
    }
  }, [userId]);

  // GST Configuration states
  const [applyGst, setApplyGst] = useState(false);
  const [gstRate, setGstRate] = useState(18);

  useEffect(() => {
     if (userProfile?.gstNumber) {
        setApplyGst(true);
        setGstRate(18);
     } else {
        setApplyGst(false);
        setGstRate(0);
     }
  }, [userProfile]);

  // Buyer Info states
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');

  // Toast Notification states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'

  const showSuccessToast = (msg) => {
    setToastMessage(msg);
    setToastType('success');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const showErrorToast = (msg) => {
    setToastMessage(msg);
    setToastType('error');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
     const realProds = products.filter(p => !p._headers);
     if (searchTerm.trim().length > 0) {
        const term = searchTerm.trim().toLowerCase();
        const filtered = realProds.filter(p =>
            (p.name || '').toLowerCase().includes(term) ||
            (p.productId && String(p.productId).toLowerCase().includes(term))
        );
        // Sort results by SKU code ascending
        const sortedFiltered = [...filtered].sort((a, b) => {
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
        setSearchResults(sortedFiltered);
     } else {
        setSearchResults([]);
     }
  }, [searchTerm, products]);

  const fetchBills = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/products/bills`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setBills(data);
      }
    } catch(e) {
      console.error("Failed to fetch billing history:", e);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchBills();
    }
  }, [activeTab]);

  const addToCart = (product) => {
     const maxQty = parseInt(product.quantity || '0', 10);
     if (maxQty <= 0) {
        showErrorToast("This item is Out of Stock!");
        return;
     }

     const exists = cart.find(item => item.id === product.id);
     if (exists) {
        const currentQty = parseInt(exists.quantity, 10) || 0;
        if (currentQty >= maxQty) {
           showErrorToast(`Only ${maxQty} units of this item are available in stock.`);
           return;
        }
        saveAndSetCart(cart.map(item => item.id === product.id ? {...item, quantity: currentQty + 1} : item));
     } else {
        // Initialize manualPrice from mrp (user can override it)
        saveAndSetCart([...cart, {...product, quantity: 1, availableStock: maxQty, manualPrice: product.mrp || '0'}]);
     }
     setSearchTerm('');
  };

  const updateQty = (id, delta) => {
     let exceeded = false;
     let maxQty = 0;
     const newCart = cart.map(item => {
        if (item.id === id) {
           const currentQty = parseInt(item.quantity, 10) || 0;
           const newQty = currentQty + delta;
           if (delta > 0 && newQty > item.availableStock) {
              exceeded = true;
              maxQty = item.availableStock;
              return item;
           }
           return { ...item, quantity: Math.max(1, newQty) };
        }
        return item;
     });

     if (exceeded) {
        showErrorToast(`Only ${maxQty} items are in stock!`);
     } else {
        saveAndSetCart(newCart);
     }
  };

  const handleDirectQtyChange = (id, newQty) => {
     let exceeded = false;
     let maxQty = 0;
     const updated = cart.map(item => {
        if (item.id === id) {
           if (newQty !== '' && newQty > item.availableStock) {
              exceeded = true;
              maxQty = item.availableStock;
              return { ...item, quantity: item.availableStock };
           }
           return { ...item, quantity: newQty };
        }
        return item;
     });
     
     if (exceeded) {
        showErrorToast(`Only ${maxQty} items are in stock!`);
     }
     saveAndSetCart(updated);
  };

  const removeFromCart = (id) => {
     saveAndSetCart(cart.filter(item => item.id !== id));
  };

  const handleCheckout = async () => {
     if (cart.length === 0) return;
     try {
         const res = await fetch(`${API_BASE_URL}/api/user/products/sell`, {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`
             },
             body: JSON.stringify({
               cart: cart.map(item => ({
                 id: item.id,
                 quantity: parseInt(item.quantity, 10) || 1,
                 manualPrice: item.manualPrice || item.mrp || '0'
               })),
               buyerName,
               buyerPhone,
               buyerAddress,
               hasGst: applyGst,
               gstRate: parseFloat(gstRate || 0)
             })
         });
         if (res.ok) {
            const data = await res.json();
            setBuyerName('');
            setBuyerPhone('');
            setBuyerAddress('');
            saveAndSetCart([]);
            setLastBill(data.bill);
            onSaleSuccess();
            fetchBills();
         }
     } catch (e) {
        console.error("Checkout failed:", e);
     }
  };

  // Use manualPrice for subtotal calculation
  const subtotal = cart.reduce((acc, item) => acc + (parseFloat(item.manualPrice || item.mrp || 0) * item.quantity), 0);
  const gstAmount = applyGst ? subtotal * (parseFloat(gstRate || 0) / 100) : 0;
  const totalAmount = subtotal + gstAmount;

  const handlePrint = () => {
     window.print();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const dateObj = new Date(timestamp);
    return dateObj.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(/am/i, 'am').replace(/pm/i, 'pm');
  };

  const shareWhatsApp = async (bill) => {
    // If the modal isn't open for this specific bill, temporarily mount it so html2pdf can capture it
    let tempMounted = false;
    if (!lastBill || lastBill.id !== bill.id) {
       setLastBill(bill);
       tempMounted = true;
       // Wait 300ms for React render cycle
       await new Promise(resolve => setTimeout(resolve, 300));
    }

    const element = document.getElementById('printable-invoice');
    
    // Fallback share text
    const isGst = bill.hasGst !== undefined ? !!bill.hasGst : !!userProfile?.gstNumber;
    const finalTotal = isGst ? bill.total : bill.subtotal;
    let itemsText = bill.items.map(item => {
      const rate = parseFloat(item.salePrice || item.mrp || 0);
      const qty = item.quantity || 1;
      return `• ${item.name} (${qty} x ₹${rate.toFixed(2)}) = ₹${(rate * qty).toFixed(2)}`;
    }).join('\n');

    const shareText = `*INVOICE FROM ${userProfile?.businessName || 'Test Warehouse'}*\n` +
      `-------------------------------------------\n` +
      `*Order ID:* ${bill.id}\n` +
      `*Date:* ${formatDate(bill.date)}\n` +
      `-------------------------------------------\n` +
      `*Items:*\n${itemsText}\n` +
      `-------------------------------------------\n` +
      `${isGst ? `*Subtotal:* ₹${bill.subtotal.toFixed(2)}\n*GST (${bill.subtotal > 0 ? Math.round((bill.gst / bill.subtotal) * 100) : 18}%):* ₹${bill.gst.toFixed(2)}\n` : ''}` +
      `*TOTAL AMOUNT:* ₹${finalTotal.toFixed(2)}\n` +
      `-------------------------------------------\n` +
      `Thank you for shopping with us!\n\n` +
      `*Billing generated using Ant X IMS*\n` +
      `_Smart Warehouse Intelligence & Inventory System_\n` +
      `_Visit: www.inventoryant.com_`;

    if (window.html2pdf && element) {
       showSuccessToast("Generating PDF Invoice...");
       try {
          // Temporarily hide the close/print action buttons panel so they aren't captured in the PDF
          const actionButtons = element.querySelector('.no-print-btn');
          if (actionButtons) actionButtons.style.display = 'none';

          const opt = {
            margin: [8, 8, 8, 8],
            filename: `Invoice_${bill.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
          };

          // Generate PDF blob
          const blob = await window.html2pdf().from(element).set(opt).outputPdf('blob');
          
          if (actionButtons) actionButtons.style.display = '';

          const file = new File([blob], `Invoice_${bill.id}.pdf`, { type: 'application/pdf' });

          // Try native file sharing (e.g. mobile apps / devices)
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
             await navigator.share({
                files: [file],
                title: `Invoice ${bill.id}`,
                text: shareText
             });
          } else {
             // Fallback for Desktop/unsupported browsers: trigger direct download & open WhatsApp link
             window.html2pdf().from(element).set(opt).save();
             showSuccessToast("PDF downloaded! Opening WhatsApp...");
             const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + "\n\n(Please attach the downloaded PDF Invoice file to send it)")}`;
             window.open(whatsappUrl, '_blank');
          }
       } catch (err) {
          console.error("PDF generation/sharing failed:", err);
          // Fallback to text share
          const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
          window.open(whatsappUrl, '_blank');
       }
    } else {
       // Graceful fallback to text share if html2pdf didn't load
       const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
       window.open(whatsappUrl, '_blank');
    }

    // Clean up temporary modal mount if needed
    if (tempMounted) {
       setLastBill(null);
    }
  };

  const shareSystem = async (bill) => {
    const isGst = bill.hasGst !== undefined ? !!bill.hasGst : !!userProfile?.gstNumber;
    const finalTotal = isGst ? bill.total : bill.subtotal;
    const shareText = `Invoice from ${userProfile?.businessName || 'Test Warehouse'} - Order: ${bill.id} - Total: ₹${finalTotal.toFixed(2)} - Generated via Ant X IMS (www.inventoryant.com)`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Invoice ${bill.id}`, text: shareText, url: window.location.origin });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }
  };

  const triggerPrintForBill = (bill) => {
     setLastBill(bill);
     setTimeout(() => { window.print(); }, 150);
  };

  return (
     <div className="p-4 md:p-8 flex-1 flex flex-col overflow-y-auto bg-[#F8FAFC]">
        {/* Style injection */}
        <style>{`
          :root {
            --inv-bg: #ffffff;
            --inv-border: #475569;
            --inv-bg-alt: #f8fafc;
            --inv-text-primary: #1e293b;
            --inv-text-secondary: #475569;
            --inv-text-muted: #64748b;
          }
          .dark-theme {
            --inv-bg: #1e293b;
            --inv-border: #334155;
            --inv-bg-alt: #0f172a;
            --inv-text-primary: #f8fafc;
            --inv-text-secondary: #cbd5e1;
            --inv-text-muted: #94a3b8;
          }
          .invoice-items-container { max-height: 280px; overflow-y: auto; }
          .invoice-items-container::-webkit-scrollbar { width: 6px; }
          .invoice-items-container::-webkit-scrollbar-track { background: transparent; }
          .invoice-items-container::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 3px; }
          .cart-items-container { max-height: 360px; overflow-y: auto; padding-right: 4px; }
          .cart-items-container::-webkit-scrollbar { width: 6px; }
          .cart-items-container::-webkit-scrollbar-track { background: transparent; }
          .cart-items-container::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 3px; }
          @media print {
            body * { visibility: hidden !important; }
            .print-modal-overlay, #printable-invoice, #printable-invoice * { visibility: visible !important; }
            .invoice-items-container { max-height: none !important; overflow: visible !important; }
            .print-modal-overlay { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; height: auto !important; background: white !important; backdrop-filter: none !important; padding: 0 !important; margin: 0 !important; display: block !important; overflow: visible !important; }
            #printable-invoice { --inv-bg: #ffffff !important; --inv-border: #475569 !important; --inv-bg-alt: #f8fafc !important; --inv-text-primary: #1e293b !important; --inv-text-secondary: #475569 !important; --inv-text-muted: #64748b !important; position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; max-width: 100% !important; border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
            .no-print-btn { display: none !important; }
            @page { size: landscape; margin: 10mm; }
            html, body, #root, #root > div { overflow: visible !important; height: auto !important; }
          }
        `}</style>

        {/* Header */}
        <div className="flex flex-col mb-4 no-print-btn text-left">
           <h1 className="m-0 text-3xl font-extrabold tracking-tight text-indigo-600">Sales Terminal</h1>
           <div className="flex gap-6 border-b border-slate-100 pb-3 mt-4">
             <button onClick={() => setActiveTab('terminal')} className={`pb-1 text-sm font-bold border-none bg-transparent cursor-pointer transition-all ${activeTab === 'terminal' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`} style={{ borderBottom: activeTab === 'terminal' ? '2px solid #6366f1' : '2px solid transparent', borderRadius: 0 }}>Terminal</button>
             <button onClick={() => setActiveTab('history')} className={`pb-1 text-sm font-bold border-none bg-transparent cursor-pointer transition-all ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`} style={{ borderBottom: activeTab === 'history' ? '2px solid #6366f1' : '2px solid transparent', borderRadius: 0 }}>Billing History</button>
           </div>
        </div>

        {activeTab === 'terminal' ? (
           <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 flex-1">
              {/* Search Panel */}
              <div className="flex-[2] min-w-[320px] no-print-btn text-left">
                 <div className="relative mt-2">
                    <div className="relative">
                       <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                       <input
                          type="text"
                          placeholder="Scan Barcode or Search SKU / Name..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          onKeyDown={e => {
                             if (e.key === 'Enter' && searchResults.length > 0) {
                               // Find the first in-stock item
                               const inStockItem = searchResults.find(p => {
                                 const q = parseInt(p.quantity || '0', 10);
                                 return !isNaN(q) && q > 0;
                               });
                               if (inStockItem) {
                                 addToCart(inStockItem);
                               } else {
                                 showErrorToast("This item is Out of Stock!");
                               }
                             }
                           }}
                          className="w-full p-4 pl-12 text-sm text-slate-800 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                       />
                    </div>
                    {searchResults.length > 0 && (
                       <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                          {searchResults.map(p => {
                             const qty = parseInt(p.quantity || '0', 10);
                             const isOutOfStock = isNaN(qty) || qty <= 0;
                             return (
                               <div
                                 key={p.id}
                                 className={`flex items-center justify-between p-4 transition-colors border-b border-slate-100 last:border-b-0 ${isOutOfStock ? 'bg-red-50/40 hover:bg-red-50/60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}
                                 onClick={() => {
                                   if (isOutOfStock) { showErrorToast("This item is Out of Stock!"); return; }
                                   addToCart(p);
                                 }}
                               >
                                  <div className="flex flex-col text-left">
                                     <div className="flex items-center gap-2">
                                        <span className={`font-bold text-sm ${isOutOfStock ? 'text-red-800 line-through decoration-red-300' : 'text-slate-800'}`}>{p.name}</span>
                                        {isOutOfStock && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Out of Stock</span>}
                                     </div>
                                     <div className="text-xs text-slate-400 font-semibold mt-0.5">
                                        SKU: {p.productId || '---'}
                                        {(() => { const d = getProductDetailsText(p); return d ? ` • ${d}` : ''; })()}
                                     </div>
                                     <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                                        Available Stock: {p.quantity || '0'} units
                                     </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`${isOutOfStock ? 'text-red-500' : 'text-indigo-600'} font-bold text-sm`}>₹{p.mrp || '0'}</div>
                                    <div className="text-[10px] text-slate-400">Cost Price</div>
                                  </div>
                               </div>
                             );
                          })}
                       </div>
                    )}
                 </div>

                 {/* Instruction Banner */}
                 {cart.length === 0 && (
                   <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-center">
                     <ShoppingCart size={32} className="text-indigo-300 mx-auto mb-3" />
                     <p className="text-sm font-semibold text-indigo-500">Search for a product above to add it to the cart.</p>
                     <p className="text-xs text-indigo-400 mt-1">You can set a custom Sale Price for each item before checkout.</p>
                   </div>
                 )}
              </div>

              {/* Cart Panel */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex-1 min-w-[320px] p-6 flex flex-col justify-between no-print-btn">
                 <div>
                    <h2 className="m-0 text-slate-800 text-lg font-bold mb-4 flex items-center gap-2 text-left">
                       <ShoppingCart size={20} className="text-indigo-500" /> Payload Batch
                       {cart.length > 0 && <span className="ml-auto text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{cart.length} items</span>}
                    </h2>
                    <div className="flex flex-col gap-3 cart-items-container">
                       {cart.length === 0 ? (
                         <p className="text-slate-500 text-sm italic bg-slate-50 p-4 rounded-xl text-center border border-slate-100">Cart is empty.</p>
                       ) : (
                         cart.map(item => (
                            <div key={item.id} className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                               <div className="flex-1 min-w-0 text-left">
                                   <div className="font-bold text-sm text-slate-800 truncate">{item.name}</div>
                                   {(() => { const d = getProductDetailsText(item); return d ? <div className="text-[10px] text-slate-400 mt-0.5 truncate">{d}</div> : null; })()}
                                   <div className="text-[10px] text-slate-400 mt-1">Cost Price: ₹{item.mrp || '0'}</div>
                                   <div className="text-[10px] text-indigo-600 font-bold mt-0.5">Available Stock: {item.availableStock || '0'} units</div>
                                   {/* Manual Sale Price Input */}
                                   <div className="flex items-center gap-2 mt-2">
                                     <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider whitespace-nowrap">Sale Price (₹)</label>
                                     <input
                                       type="number"
                                       min="0"
                                       step="0.01"
                                       value={item.manualPrice !== undefined ? item.manualPrice : (item.mrp || '')}
                                       onChange={e => saveAndSetCart(cart.map(ci => ci.id === item.id ? {...ci, manualPrice: e.target.value} : ci))}
                                       className="w-24 text-xs font-bold text-indigo-700 bg-white border border-indigo-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 rounded-lg px-2 py-1 outline-none transition-all"
                                       placeholder="Enter price"
                                     />
                                   </div>
                               </div>
                               <div className="flex flex-col items-end gap-2 shrink-0">
                                 <div className="text-xs font-bold text-slate-700">
                                   ₹{(parseFloat(item.manualPrice || item.mrp || 0) * (parseInt(item.quantity, 10) || 1)).toFixed(2)}
                                 </div>
                                 <div className="flex items-center gap-2">
                                   <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 gap-1">
                                      <button onClick={() => updateQty(item.id, -1)} className="hover:bg-slate-100 border-none bg-transparent text-slate-700 w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-colors"><Minus size={12} /></button>
                                      <input 
                                         type="number"
                                         min="1"
                                         max={item.availableStock}
                                         value={item.quantity}
                                         onChange={e => {
                                           const val = e.target.value;
                                           if (val === '') {
                                             handleDirectQtyChange(item.id, '');
                                           } else {
                                             const parsed = parseInt(val, 10);
                                             handleDirectQtyChange(item.id, isNaN(parsed) ? 1 : parsed);
                                           }
                                         }}
                                         onBlur={e => {
                                           const val = e.target.value;
                                           const parsed = parseInt(val, 10);
                                           if (val === '' || isNaN(parsed) || parsed < 1) {
                                             handleDirectQtyChange(item.id, 1);
                                           } else if (parsed > item.availableStock) {
                                             showErrorToast(`Only ${item.availableStock} items are in stock!`);
                                             handleDirectQtyChange(item.id, item.availableStock);
                                           }
                                         }}
                                         className="font-bold text-slate-800 text-xs w-8 text-center border-none focus:outline-none p-0 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-0"
                                       />
                                      <button onClick={() => updateQty(item.id, 1)} className="hover:bg-slate-100 border-none bg-transparent text-slate-700 w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-colors"><Plus size={12} /></button>
                                   </div>
                                   <button onClick={() => removeFromCart(item.id)} className="hover:bg-red-50 hover:text-red-500 border border-slate-200 text-slate-400 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors bg-white"><Trash2 size={14} /></button>
                                 </div>
                               </div>
                            </div>
                         ))
                       )}
                    </div>

                    {cart.length > 0 && (
                      <div className="border-t border-slate-100 mt-4 pt-4 flex flex-col gap-3 text-left">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buyer Info (Optional)</span>
                         <input type="text" placeholder="Buyer Name" value={buyerName} onChange={e => setBuyerName(e.target.value)} className="w-full p-3 text-xs text-slate-800 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none transition-all placeholder-slate-400" />
                         <input type="text" placeholder="Buyer Phone Number" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} className="w-full p-3 text-xs text-slate-800 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none transition-all placeholder-slate-400" />
                         <input type="text" placeholder="Shipping / Billing Address" value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} className="w-full p-3 text-xs text-slate-800 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none transition-all placeholder-slate-400" />
                      </div>
                    )}
                 </div>

                 <div className="border-t border-slate-100 mt-6 pt-5">
                    {/* GST Configuration */}
                    {userProfile?.gstNumber && (
                       <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4 text-left flex flex-col gap-2.5">
                          <div className="flex items-center justify-between">
                             <label className="text-xs font-bold text-slate-600 flex items-center gap-2 cursor-pointer">
                                <input 
                                   type="checkbox" 
                                   checked={applyGst} 
                                   onChange={(e) => setApplyGst(e.target.checked)} 
                                   className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                />
                                Apply GST (Tax)
                             </label>
                          </div>
                          {applyGst && (
                             <div className="flex flex-col gap-2 mt-1">
                                <div className="flex items-center gap-3">
                                   <span className="text-xs text-slate-500 font-medium whitespace-nowrap">GST Rate (%):</span>
                                   <input 
                                      type="number" 
                                      min="0" 
                                      max="100" 
                                      step="0.1"
                                      value={gstRate} 
                                      onChange={(e) => setGstRate(e.target.value)} 
                                      className="w-20 p-2 text-xs text-slate-800 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg outline-none transition-all font-mono font-bold"
                                   />
                                </div>
                                <div className="flex gap-1.5 flex-wrap">
                                   {[0, 5, 12, 18, 28].map(r => (
                                      <button 
                                         key={r}
                                         type="button" 
                                         onClick={() => setGstRate(r)}
                                         className={`px-2.5 py-1 text-[10px] font-bold rounded cursor-pointer border ${parseFloat(gstRate) === r ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                      >
                                         {r}%
                                      </button>
                                   ))}
                                </div>
                             </div>
                          )}
                       </div>
                    )}

                    <div className="flex flex-col gap-2 mb-4 text-left text-sm">
                       {applyGst ? (
                          <>
                             <div className="flex justify-between items-center text-xs font-semibold text-slate-400"><span>Subtotal:</span><span className="font-mono text-slate-700">₹{subtotal.toFixed(2)}</span></div>
                             <div className="flex justify-between items-center text-xs font-semibold text-slate-400"><span>GST ({gstRate}%):</span><span className="font-mono text-emerald-600">+₹{gstAmount.toFixed(2)}</span></div>
                          </>
                       ) : (
                          <div className="flex justify-between items-center text-xs font-semibold text-slate-400"><span>Items Price:</span><span className="font-mono text-slate-700">₹{subtotal.toFixed(2)}</span></div>
                       )}
                    </div>
                    <div className="flex justify-between items-center text-xl font-extrabold text-slate-800 border-t border-slate-100 pt-4">
                       <span>Total:</span>
                       <span className="text-indigo-600 font-mono">₹{totalAmount.toFixed(2)}</span>
                    </div>
                    <button
                      className={`w-full mt-5 py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border-none ${cart.length === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-md hover:shadow-lg'}`}
                      disabled={cart.length === 0}
                      onClick={handleCheckout}
                    >
                      <Check size={18} /> Confirm Terminal Sync
                    </button>
                 </div>
              </div>
           </div>
        ) : (
           <div className="w-full no-print-btn text-left">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6">
                 <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Receipt size={22} className="text-indigo-500" /> Billing Transaction History
                 </h2>
                 {bills.length === 0 ? (
                    <p className="text-slate-500 italic bg-slate-50 p-6 rounded-xl text-center border border-slate-100">No billing transactions recorded yet.</p>
                 ) : (
                    <div className="overflow-x-auto">
                       <table className="w-full text-left text-sm border-collapse">
                          <thead>
                             <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                <th className="p-4 pl-6">Invoice ID</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Buyer Details</th>
                                <th className="p-4">Items Count</th>
                                <th className="p-4">Total Amount</th>
                                <th className="p-4">Generated By</th>
                                <th className="p-4 text-right pr-6">Action</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {bills.map(b => (
                                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                                   <td className="p-4 pl-6 font-mono font-bold text-xs text-indigo-600">{b.id}</td>
                                   <td className="p-4 text-xs text-slate-600">{formatDate(b.date)}</td>
                                   <td className="p-4 text-xs">
                                      {b.buyerName ? (
                                         <div className="flex flex-col gap-0.5">
                                            <span className="font-bold text-slate-800">{b.buyerName}</span>
                                            {b.buyerPhone && <span className="text-[10px] text-slate-400">{b.buyerPhone}</span>}
                                         </div>
                                      ) : <span className="text-slate-400 italic">None</span>}
                                   </td>
                                   <td className="p-4 text-xs font-bold text-slate-700">{b.items?.reduce((acc, it) => acc + (it.quantity || 0), 0) || 0} units</td>
                                   <td className="p-4 text-sm font-extrabold text-slate-800">₹{b.total?.toFixed(2)}</td>
                                   <td className="p-4 text-xs font-bold text-slate-600">{b.operatorName || 'Owner'}</td>
                                   <td className="p-4 text-right pr-6 flex items-center justify-end gap-2">
                                      <button onClick={() => setLastBill(b)} className="py-1.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-none rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 inline-flex" title="View Invoice"><Receipt size={14} /> View Invoice</button>
                                      <button onClick={() => triggerPrintForBill(b)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer transition-colors border-none inline-flex" title="Download PDF / Print"><Download size={14} /></button>
                                      <button onClick={() => shareWhatsApp(b)} className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg cursor-pointer transition-colors border-none inline-flex" title="Share on WhatsApp"><Send size={14} /></button>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 )}
              </div>
           </div>
        )}

        {/* Printable Invoice Modal */}
        {lastBill && (() => {
          const showGst = lastBill.hasGst !== undefined ? !!lastBill.hasGst : !!userProfile?.gstNumber;
          return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 overflow-y-auto print-modal-overlay">
              <div id="printable-invoice" className="rounded-2xl w-full max-w-4xl p-6 md:p-8 shadow-2xl border flex flex-col gap-6" style={{ backgroundColor: 'var(--inv-bg)', borderColor: 'var(--inv-border)', color: 'var(--inv-text-secondary)', transition: 'none' }}>
                <div style={{ border: '1px solid var(--inv-border)', borderRadius: '12px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--inv-bg-alt)' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase' }}>{showGst ? 'Tax Invoice' : 'Invoice'}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--inv-text-muted)', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '2px' }}>Original for Recipient</span>
                   </div>
                   <div style={{ display: 'flex', gap: '2rem', fontSize: '0.75rem', textAlign: 'left', color: 'var(--inv-text-secondary)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                         <div><strong>Order ID:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--inv-text-primary)' }}>{lastBill.id}</span></div>
                         <div><strong>Order Date:</strong> <span style={{ color: 'var(--inv-text-primary)' }}>{formatDate(lastBill.date)}</span></div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                         <div><strong>Invoice No:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--inv-text-primary)' }}>{lastBill.id}</span></div>
                         {showGst && userProfile?.gstNumber && <div><strong>GSTIN:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--inv-text-primary)', fontWeight: 'bold' }}>{userProfile.gstNumber}</span></div>}
                      </div>
                   </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', flexWrap: 'wrap' }}>
                   <div style={{ flex: '1 1 300px', border: '1px solid var(--inv-border)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'left', fontSize: '0.75rem', backgroundColor: 'var(--inv-bg)', color: 'var(--inv-text-secondary)' }}>
                      <strong style={{ textTransform: 'uppercase', color: 'var(--inv-text-muted)', fontSize: '0.65rem', letterSpacing: '1px', marginBottom: '0.25rem' }}>Sold By</strong>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--inv-text-primary)' }}>{userProfile?.businessName || 'Warehouse'}</strong>
                      <div>{userProfile?.businessAddress || ''}</div>
                      <div>Phone: {userProfile?.phone || ''}</div>
                      {userProfile?.email && <div>Email: {userProfile.email}</div>}
                   </div>
                   <div style={{ flex: '1 1 300px', border: '1px solid var(--inv-border)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'left', fontSize: '0.75rem', backgroundColor: 'var(--inv-bg)', color: 'var(--inv-text-secondary)' }}>
                      <strong style={{ textTransform: 'uppercase', color: 'var(--inv-text-muted)', fontSize: '0.65rem', letterSpacing: '1px', marginBottom: '0.25rem' }}>Billed To</strong>
                      {lastBill.buyerName || lastBill.buyerPhone || lastBill.buyerAddress ? (
                         <>
                            {lastBill.buyerName && <div><strong>Name:</strong> <span style={{ color: 'var(--inv-text-primary)', fontWeight: 'bold' }}>{lastBill.buyerName}</span></div>}
                            {lastBill.buyerPhone && <div><strong>Phone:</strong> <span style={{ color: 'var(--inv-text-primary)', fontWeight: 'bold' }}>{lastBill.buyerPhone}</span></div>}
                            {lastBill.buyerAddress && <div><strong>Address:</strong> <span style={{ color: 'var(--inv-text-primary)', fontWeight: 'bold' }}>{lastBill.buyerAddress}</span></div>}
                         </>
                      ) : <div style={{ color: 'var(--inv-text-muted)', fontStyle: 'italic' }}>Walk-in Customer / Retail Invoice</div>}
                   </div>
                </div>

                {/* Invoice Items Table */}
                <div className="invoice-items-container" style={{ border: '1px solid var(--inv-border)', borderRadius: '12px', overflow: 'hidden' }}>
                   <table className="w-full text-left text-xs" style={{ borderCollapse: 'collapse', margin: 0, backgroundColor: 'var(--inv-bg)' }}>
                      <thead>
                         <tr style={{ background: 'var(--inv-bg-alt)', borderBottom: '1px solid var(--inv-border)' }}>
                            <th style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: 'var(--inv-text-secondary)', fontSize: '0.7rem' }}>PRODUCT</th>
                            <th style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: 'var(--inv-text-secondary)', fontSize: '0.7rem' }}>DESCRIPTION</th>
                            <th style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: 'var(--inv-text-secondary)', fontSize: '0.7rem', textAlign: 'center' }}>QTY</th>
                            <th style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: 'var(--inv-text-secondary)', fontSize: '0.7rem', textAlign: 'right' }}>RATE (₹)</th>
                            {showGst && <th style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: 'var(--inv-text-secondary)', fontSize: '0.7rem', textAlign: 'right' }}>GST ({lastBill.subtotal > 0 ? Math.round((lastBill.gst / lastBill.subtotal) * 100) : 18}%)</th>}
                            <th style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: 'var(--inv-text-secondary)', fontSize: '0.7rem', textAlign: 'right' }}>TOTAL</th>
                         </tr>
                      </thead>
                      <tbody>
                         {lastBill.items.map((item, idx) => {
                            const rate = parseFloat(item.salePrice || item.mrp || 0);
                            const qty = item.quantity || 1;
                            const gross = rate * qty;
                            const gstRateFactor = showGst && lastBill.subtotal > 0 ? (lastBill.gst / lastBill.subtotal) : 0;
                            const itemGst = gross * gstRateFactor;
                            const itemTotal = gross + itemGst;
                            const matchingProduct = products.find(p => p.id === item.id);
                            const detailsText = matchingProduct ? getProductDetailsText(matchingProduct) : '';
                            return (
                               <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--inv-border)' }}>
                                  <td style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: 'var(--inv-text-primary)', textAlign: 'left' }}>{item.name}</td>
                                  <td style={{ padding: '0.85rem 1rem', color: 'var(--inv-text-secondary)', fontSize: '0.65rem', textAlign: 'left' }}>{detailsText || 'No details'}</td>
                                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--inv-text-primary)' }}>{qty}</td>
                                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'monospace', color: 'var(--inv-text-secondary)' }}>₹{rate.toFixed(2)}</td>
                                  {showGst && <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#10B981', fontFamily: 'monospace' }}>₹{itemGst.toFixed(2)}</td>}
                                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--inv-text-primary)', fontFamily: 'monospace' }}>₹{itemTotal.toFixed(2)}</td>
                               </tr>
                            );
                         })}
                         {showGst && (
                             <>
                                <tr style={{ borderTop: '1px solid var(--inv-border)', fontWeight: 'bold' }}>
                                   <td colSpan={5} style={{ padding: '0.5rem 1rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--inv-text-secondary)' }}>Subtotal:</td>
                                   <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--inv-text-secondary)' }}>₹{lastBill.subtotal.toFixed(2)}</td>
                                </tr>
                                <tr style={{ fontWeight: 'bold' }}>
                                   <td colSpan={5} style={{ padding: '0.5rem 1rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--inv-text-secondary)' }}>GST ({lastBill.subtotal > 0 ? Math.round((lastBill.gst / lastBill.subtotal) * 100) : 18}%):</td>
                                   <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontFamily: 'monospace', color: '#10B981' }}>+₹{lastBill.gst.toFixed(2)}</td>
                                </tr>
                             </>
                          )}
                         <tr style={{ background: 'var(--inv-bg-alt)', fontWeight: 'bold', borderTop: '2px solid var(--inv-border)' }}>
                            <td colSpan={showGst ? 4 : 3} style={{ padding: '1rem', textAlign: 'left', color: 'var(--inv-text-primary)' }}>
                               TOTAL QTY: {lastBill.items.reduce((acc, item) => acc + (item.quantity || 0), 0)}
                            </td>
                            <td colSpan={showGst ? 2 : 2} style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--inv-text-primary)' }}>
                               TOTAL: <span style={{ fontSize: '1rem', color: '#6366f1', fontFamily: 'monospace' }}>₹{(showGst ? lastBill.total : lastBill.subtotal)?.toFixed(2)}</span>
                            </td>
                         </tr>
                      </tbody>
                   </table>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed var(--inv-border)', borderBottom: '1px dashed var(--inv-border)', padding: '0.65rem 1rem', margin: '0.5rem 0', backgroundColor: 'var(--inv-bg-alt)', borderRadius: '8px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>🐜</span>
                      <div style={{ textAlign: 'left' }}>
                         <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--inv-text-primary)' }}>Powered by Ant X IMS</div>
                         <div style={{ fontSize: '0.6rem', color: 'var(--inv-text-muted)' }}>Simplify inventory management, billing, and OCR warehouse scanning.</div>
                      </div>
                   </div>
                   <div style={{ fontSize: '0.65rem', fontWeight: 'extrabold', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      www.inventoryant.com
                   </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--inv-text-secondary)' }}>
                   <div><strong>Declaration:</strong> The goods sold are intended for end user consumption and not for resale.</div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2 no-print-btn">
                  <button onClick={handlePrint} className="flex-1 min-w-[140px] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer border-none"><Download size={16} /> Download PDF / Print</button>
                  <button onClick={() => shareWhatsApp(lastBill)} className="flex-1 min-w-[140px] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer border-none"><Send size={16} /> Share on WhatsApp</button>
                  {navigator.share && <button onClick={() => shareSystem(lastBill)} className="flex-1 min-w-[140px] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer border-none"><Share2 size={16} /> Share Bill</button>}
                  <button onClick={() => setLastBill(null)} className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-none"><X size={14} /> Close</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Toast Notification */}
        <div className={`fixed bottom-6 right-1/2 translate-x-1/2 z-[2000] transition-all duration-300 transform ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
          <div className={`px-5 py-3.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex items-center gap-3 border backdrop-blur-md text-white ${toastType === 'error' ? 'bg-red-900/90 border-red-700/50' : 'bg-slate-900/90 border-slate-700/50'}`}>
            <div className={`p-1.5 rounded-full ${toastType === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {toastType === 'error' ? <AlertTriangle size={18} /> : <Check size={18} />}
            </div>
            <span className="text-sm font-bold tracking-wide">{toastMessage}</span>
          </div>
        </div>
     </div>
  );
}

export default Billing;
