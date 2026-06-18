import React, { useState, useEffect } from 'react';
import '../../App.css';

function ScannerModal({ isOpen, onClose, scanType, userId, onScanSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setScanResult(null);
      setLoading(false);
    }
  }, [isOpen]);

  const processBill = async () => {
    if (!file) return;
    setLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
       const base64Str = event.target.result.split(',')[1];
       try {
         const res = await fetch('http://localhost:3000/products/scan-bill', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
             body: JSON.stringify({ 
                 fileName: file.name, 
                 fileType: file.type, 
                 base64Image: base64Str,
                 actionType: scanType 
             })
         });
         const data = await res.json();
         setScanResult(data);
         if(onScanSuccess) onScanSuccess(); 
       } catch (e) {
         console.error('Scan Error:', e);
         alert("AI server communication failed.");
       }
       setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex justify-center items-center z-[1000] p-4">
       <div className="glass-panel p-6 md:p-12 w-full max-w-[600px] border border-[var(--glass-border)] relative">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-6 bg-transparent border-none text-[var(--text-muted)] text-3xl cursor-pointer hover:text-[var(--danger)] transition-colors"
          >
            &times;
          </button>
          
          <h2 className="mt-0 flex items-center gap-3 text-[var(--primary)] text-2xl font-bold mb-6">
              {scanType === 'IN' ? '📥 Inbound Scanner' : '📤 Outbound Scanner'}
          </h2>
          
          {!scanResult && !loading && (
             <div className="mt-6 flex flex-col gap-6">
                <div className="ai-card p-10 md:p-16 border-2 border-dashed border-[var(--glass-border)] text-center cursor-pointer hover:border-[var(--primary)] hover:shadow-lg transition-all duration-300">
                   <input type="file" id="ai-file" onChange={(e) => setFile(e.target.files[0])} className="hidden" />
                   <label htmlFor="ai-file" className="cursor-pointer flex flex-col items-center justify-center">
                       <div className="text-5xl md:text-6xl mb-4">📁</div>
                       <div className="text-[var(--text-dark)] font-semibold text-base md:text-lg break-all">
                         {file ? file.name : "Select Target Data"}
                       </div>
                       <div className="text-[var(--text-muted)] text-xs mt-2 font-mono">SUPPORTED: PNG, JPG, PDF</div>
                   </label>
                </div>
                <button 
                  className="btn-primary py-4 px-6 w-full text-base font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:box-shadow-none"
                  disabled={!file} 
                  onClick={processBill}
                >
                   Execute Neural Mapping
                </button>
             </div>
          )}

          {loading && (
             <div className="py-12 text-center flex flex-col items-center justify-center">
               <div className="text-6xl mb-6 animate-spin">⚙️</div>
               <h3 className="glow-text text-xl font-bold">AI is mapping document...</h3>
             </div>
          )}

          {scanResult && !loading && (
             <div className="mt-6">
                {scanResult.success ? (
                   <div className="p-6 bg-[var(--success-bg)] rounded-2xl border border-[var(--success)] text-center">
                       <h3 className="margin-0 text-[var(--success)] text-xl font-bold mb-2">SYNC_SUCCESS</h3>
                       <div className="text-sm text-[var(--text-main)]">{scanResult.parsedItems?.length || 0} items mapped to registry.</div>
                   </div>
                ) : (
                   <div className="p-6 bg-[var(--danger-bg)] rounded-2xl border border-[var(--danger)] text-center">
                       <h3 className="margin-0 text-[var(--danger)] text-xl font-bold mb-2">SYNC_FAILED</h3>
                       <div className="text-sm text-[var(--text-main)]">{scanResult.message || "Unknown AI error occurred."}</div>
                   </div>
                )}
                <button className="btn-primary py-4 px-6 w-full text-base font-semibold mt-6" onClick={onClose}>
                   Return to Command Center
                </button>
             </div>
          )}
       </div>
    </div>
  );
}

export default ScannerModal;
