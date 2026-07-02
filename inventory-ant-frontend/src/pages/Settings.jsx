import { API_BASE_URL } from '../utils/config';
import React, { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import '../App.css';
import Papa from 'papaparse';
import PasswordInput from '../components/ui/PasswordInput';
import { UploadCloud, Trash2, Database } from 'lucide-react';
function Settings({ userId, token, onScanResult, userRole }) {
  const fileInputRef = useRef(null);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [password, setPassword] = useState('');

  if (userRole === 'staff') {
    return (
      <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC]">
        <div className="flex flex-col mb-8 text-left">
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-[#ef4444]">Access Restricted</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Staff members are not authorized to view settings.</p>
        </div>
      </div>
    );
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("📂 File selected:", file.name);

    Papa.parse(file, {
      header: false,
      skipEmptyLines: 'greedy',
      encoding: "UTF-8",
      complete: async function(results) {
        console.log("📊 Raw Parse Results:", results.data);
        
        const rawRows = results.data;
        if (rawRows.length === 0) {
          toast.error("Error: File is empty!");
          return;
        }

        const firstRow = rawRows[0];
        let idIdx = -1, nameIdx = -1, qtyIdx = -1, priceIdx = -1, detailsIdx = -1, hsnIdx = -1, costPriceIdx = -1, sellingPriceIdx = -1;

        firstRow.forEach((val, i) => {
          const v = String(val).toLowerCase().trim();
          // Sl No / Code / SKU — must NOT match "product" columns
          if (v === 'sl no.' || v === 's.no' || v === 'sl no' || v === 'sl.no.' || v === 'sno'
              || v === 'code' || v === 'sku' || v === 'item code' || v === 'stock code'
              || v.includes('s.no') || v.includes('sl no')) idIdx = i;
          // Name: "product description" / "item name" / "name" / "product"
          if (v.includes('name') || v.includes('product') || v.includes('item description') || v.includes('item name')) nameIdx = i;
          // Quantity / Stock
          if (v.includes('qty') || v.includes('stock') || v.includes('quantity') || v.includes('total qty')) qtyIdx = i;
          // Cost Price
          if (v.includes('cost price') || v.includes('purchase price') || v === 'cost' || v === 'purchase rate') costPriceIdx = i;
          // Selling Price / MRP
          if (v.includes('selling price') || v.includes('mrp') || v.includes('sale price') || v === 'selling rate' || v === 'price' || v === 'rate') sellingPriceIdx = i;
          // Details: ONLY match if it says "details" or "desc" but NOT "product" or "item"
          if ((v.includes('details') || v === 'desc' || v === 'description') && !v.includes('product') && !v.includes('item')) detailsIdx = i;
          if (v.includes('hsn') || v.includes('sac')) hsnIdx = i;
        });

        if (sellingPriceIdx !== -1) {
          priceIdx = sellingPriceIdx;
        } else {
          firstRow.forEach((cell, i) => {
            const v = String(cell || '').toLowerCase().trim();
            // Exclude cost/purchase columns from being mapped to selling price
            const isCostCol = v.includes('cost') || v.includes('purchase');
            if (!isCostCol && (v.includes('mrp') || v.includes('price') || v.includes('rate'))) priceIdx = i;
          });
        }

        // Priority fix: if name and details landed on the same column, details wins only for
        // dedicated "details" columns. Here name takes priority so clear details collision.
        if (detailsIdx !== -1 && detailsIdx === nameIdx) detailsIdx = -1;

        if (nameIdx === -1) nameIdx = 1;
        if (qtyIdx === -1) qtyIdx = 2;
        if (priceIdx === -1) priceIdx = 3;

        // If idIdx still not found check col 0 for serial/sl no pattern
        if (idIdx === -1) {
          const v0 = String(firstRow[0] || '').toLowerCase().trim();
          if (v0 === 'sl no.' || v0 === 's.no' || v0 === 'no.' || v0 === '#' || v0 === 'sno' || v0 === 'sr no') {
            idIdx = 0;
          }
        }

        const headersMap = {
          productId: idIdx !== -1 && firstRow[idIdx] ? String(firstRow[idIdx]).trim() : 'Code',
          hsnSac: hsnIdx !== -1 && firstRow[hsnIdx] ? String(firstRow[hsnIdx]).trim() : 'HSN/SAC',
          name: nameIdx !== -1 && firstRow[nameIdx] ? String(firstRow[nameIdx]).trim() : 'Product Description',
          quantity: qtyIdx !== -1 && firstRow[qtyIdx] ? String(firstRow[qtyIdx]).trim() : 'Available Stock',
          mrp: priceIdx !== -1 && firstRow[priceIdx] ? String(firstRow[priceIdx]).trim() : (sellingPriceIdx !== -1 ? String(firstRow[sellingPriceIdx]).trim() : 'Selling Price'),
          costPrice: costPriceIdx !== -1 && firstRow[costPriceIdx] ? String(firstRow[costPriceIdx]).trim() : 'Cost Price'
        };

        const mappedData = [];
        const startRow = 1; 

        for (let i = startRow; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length < 2) continue;

          const rawName = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
          // Only use rawDesc if it's a DIFFERENT column from name
          const rawDesc = (detailsIdx !== -1 && detailsIdx !== nameIdx) ? String(row[detailsIdx] || '').trim() : '';
          // Merge only if rawDesc is non-empty AND genuinely different text
          const mergedDesc = (rawDesc && rawDesc.toLowerCase() !== rawName.toLowerCase())
            ? `${rawName} - ${rawDesc}`
            : rawName;

          const obj = {
            productId: idIdx !== -1 ? String(row[idIdx] || '').trim() : '',
            hsnSac: hsnIdx !== -1 ? String(row[hsnIdx] || '').trim() : '',
            name: mergedDesc || `Item-${i}`,
            quantity: row[qtyIdx] ? String(row[qtyIdx]).replace(/,/g, '').trim() : '0',
            mrp: priceIdx !== -1 ? String(row[priceIdx] || '').replace(/,/g, '').trim() : (sellingPriceIdx !== -1 ? String(row[sellingPriceIdx] || '').replace(/,/g, '').trim() : '0'),
            costPrice: costPriceIdx !== -1 ? String(row[costPriceIdx] || '').replace(/,/g, '').trim() : '',
            details: rawDesc && rawDesc.toLowerCase() !== rawName.toLowerCase() ? rawDesc : '',
            csv_row: i + 1,
            _timestamp: Date.now(),
            _headers: headersMap
          };

          row.forEach((cell, idx) => {
            if (![idIdx, nameIdx, qtyIdx, priceIdx, detailsIdx, hsnIdx, costPriceIdx, sellingPriceIdx].includes(idx)) {
              const rawHeader = firstRow[idx] ? String(firstRow[idx]).trim() : '';
              // Skip columns with no header name (e.g. trailing empty Excel columns that produce col_5, col_6 etc.)
              if (!rawHeader) return;
              obj[rawHeader] = cell;
            }
          });

          mappedData.push(obj);
        }

        console.log("✅ Mapped Data for Upload:", mappedData);
        toast(`Found ${mappedData.length} valid rows. Sending to server...`, { icon: '📦' });

        try {
          const res = await fetch(`${API_BASE_URL}/api/user/products/bulk`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(mappedData)
          });
          if (res.ok) {
            const finalData = await res.json();
            toast.success(`SUCCESS: ${finalData.count} items saved.`);
            onScanResult();
          } else {
            toast.error('Upload Error: Server rejected the data.');
          }
        } catch (err) {
          console.error(err);
          toast.error('Network Error.');
        }
      }
    });
  };

   const executeWipeCatalog = async () => {
    if (!password) {
      toast.error('Kripya apna password darz karein.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/products/all?password=${encodeURIComponent(password)}`, { 
        method: 'DELETE', 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      if (res.ok) {
        toast.success('Aapka saara data delete ho gaya hai.');
        setShowConfirmPopup(false);
        setPassword('');
        onScanResult();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.message || 'Incorrect password. Data delete nahi ho paya.');
      }
    } catch(e) {
      toast.error('Network Error');
    }
  };

  const handleWipeCatalog = () => {
    setPassword('');
    setShowConfirmPopup(true);
  };

  return (
    <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC]">
      <div className="flex flex-col mb-8">
        <h1 className="m-0 text-3xl font-extrabold tracking-tight text-indigo-600">
          Account Settings
        </h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">Configure warehouse data imports and system registries.</p>
      </div>

      <div className="flex flex-col gap-6 max-w-3xl">
          <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <h3 className="m-0 text-[15px] font-bold text-slate-800 flex items-center gap-2 mb-2">
               <UploadCloud size={18} className="text-indigo-500" /> Upload CSV File
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
               Apni inventory (stock) list ko bulk me add karne ke liye CSV file select karein. Headers automatically map ho jayenge.
            </p>
            <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <button 
              className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold border-none shadow-sm transition-colors cursor-pointer w-full md:w-auto" 
              onClick={() => fileInputRef.current.click()}
            >
              Select File
            </button>
         </div>
 
          <div className="bg-white border-l-4 border-l-red-500 border-y border-r border-slate-200 p-6 md:p-8 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <h3 className="m-0 text-[15px] font-bold text-red-600 flex items-center gap-2 mb-2">
               <Trash2 size={18} /> Clear All Data
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
               Apne account ka saara inventory stock aur data hamesha ke liye delete karein. Ye action undo nahi ho sakta.
            </p>
            <button 
              className="py-2.5 px-6 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors cursor-pointer w-full md:w-auto" 
              onClick={handleWipeCatalog}
            >
              Clear Data
            </button>
         </div>
      </div>
      
      {showConfirmPopup && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-800 mb-2">Delete Catalog Confirmation</h3>
            <p className="text-xs text-slate-500 font-medium mb-4 leading-relaxed">
              Kya aap sach me apna saara data delete karna chahte hain? This action cannot be undone. Please enter your password to confirm:
            </p>
            <div className="mb-6">
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowConfirmPopup(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeWipeCatalog}
                className="px-4 py-2 bg-[#EF4444] hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-sm"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
