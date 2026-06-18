import React, { useRef } from 'react';
import '../App.css';
import Papa from 'papaparse';

function Settings({ userId, onScanResult }) {
  const fileInputRef = useRef(null);

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
          alert("Error: File is empty!");
          return;
        }

        const firstRow = rawRows[0];
        let idIdx = -1, nameIdx = -1, qtyIdx = -1, priceIdx = -1;

        firstRow.forEach((val, i) => {
          const v = String(val).toLowerCase();
          if (v.includes('id') || v.includes('code') || v.includes('s.no') || v.includes('no.')) idIdx = i;
          if (v.includes('name') || v.includes('product') || v.includes('item')) nameIdx = i;
          if (v.includes('qty') || v.includes('stock')) qtyIdx = i;
          if (v.includes('mrp') || v.includes('price') || v.includes('rate')) priceIdx = i;
        });

        if (nameIdx === -1) nameIdx = 1;
        if (qtyIdx === -1) qtyIdx = 2;
        if (priceIdx === -1) priceIdx = 3;

        const headersMap = {
          productId: idIdx !== -1 && firstRow[idIdx] ? String(firstRow[idIdx]).trim() : 'Code',
          name: nameIdx !== -1 && firstRow[nameIdx] ? String(firstRow[nameIdx]).trim() : 'Item Name / Category',
          quantity: qtyIdx !== -1 && firstRow[qtyIdx] ? String(firstRow[qtyIdx]).trim() : 'Available Stock',
          mrp: priceIdx !== -1 && firstRow[priceIdx] ? String(firstRow[priceIdx]).trim() : 'MRP'
        };

        const mappedData = [];
        const startRow = 1; 

        for (let i = startRow; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length < 2) continue;

          const obj = {
            productId: row[idIdx] || '',
            name: row[nameIdx] || `Item-${i}`,
            quantity: row[qtyIdx] || '0',
            mrp: row[priceIdx] || '0',
            csv_row: i + 1,
            _timestamp: Date.now(),
            _headers: headersMap
          };

          row.forEach((cell, idx) => {
            if (![idIdx, nameIdx, qtyIdx, priceIdx].includes(idx)) {
              let colName = firstRow[idx] ? String(firstRow[idx]).trim() : `col_${idx}`;
              if (!colName) colName = `col_${idx}`;
              obj[colName] = cell;
            }
          });

          mappedData.push(obj);
        }

        console.log("✅ Mapped Data for Upload:", mappedData);
        alert(`ATTENTION: Found ${mappedData.length} valid rows. Sending to server...`);

        try {
          const res = await fetch('http://localhost:3000/products/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify(mappedData)
          });
          if (res.ok) {
            const finalData = await res.json();
            alert(`SUCCESS: ${finalData.count} items saved.`);
            onScanResult();
          } else {
            alert('Upload Error: Server rejected the data.');
          }
        } catch (err) {
          console.error(err);
          alert('Network Error.');
        }
      }
    });
  };

  const handleWipeCatalog = async () => {
    if(window.confirm("Kya aap sach me apna saara data delete karna chahte hain?")) {
        try {
            const res = await fetch('http://localhost:3000/products/all', { method: 'DELETE', headers: { 'x-user-id': userId } });
            if (res.ok) {
                alert('Aapka saara data delete ho gaya hai.');
                onScanResult();
            } else {
                alert('Error: Data delete nahi ho paya.');
            }
        } catch(e) {
            alert('Network Error');
        }
    }
  };

  return (
    <div className="p-6 md:p-10 flex-1 overflow-y-auto">
      <h1 className="mt-0 text-3xl md:text-5xl font-black mb-8">Account <span className="glow-text">Settings</span></h1>
      <div className="flex flex-col gap-8 max-w-4xl mt-10">
          <div className="ai-card p-6 md:p-8 rounded-2xl">
            <h3 className="m-0 text-xl font-bold text-[var(--primary)] mb-2">Upload CSV File</h3>
            <p className="text-[var(--text-muted)] text-sm md:text-base leading-relaxed">Apni inventory (stock) list ko bulk me add karne ke liye CSV file select karein. Headers automatically map ho jayenge.</p>
            <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <button className="btn-primary mt-6 py-3 px-6 text-sm" onClick={() => fileInputRef.current.click()}>Select File</button>
         </div>
 
          <div className="ai-card p-6 md:p-8 rounded-2xl border-l-4 border-l-[var(--danger)] border-y border-r border-[var(--glass-border)]">
            <h3 className="m-0 text-xl font-bold text-[var(--danger)] mb-2">Clear All Data</h3>
            <p className="text-[var(--text-muted)] text-sm md:text-base leading-relaxed">Apne account ka saara inventory stock aur data hamesha ke liye delete karein.</p>
            <button className="btn-danger mt-6 py-3 px-6 text-sm" onClick={handleWipeCatalog}>Clear Data</button>
         </div>
      </div>
    </div>
  );
}

export default Settings;
