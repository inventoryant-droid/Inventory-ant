import React, { useState, useEffect } from 'react';
import '../../App.css';
import { X, Inbox, Flame, FileText, CheckCircle2, Loader2, Circle } from 'lucide-react';

function ScannerModal({ isOpen, onClose, scanType, userId, token, onScanSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setScanResult(null);
      setLoading(false);
      setLoadingStep(0);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval;
    if (loading) {
       setLoadingStep(1);
       interval = setInterval(() => {
          setLoadingStep(prev => prev < 3 ? prev + 1 : prev);
       }, 800); // Fake progress steps
    } else {
       setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const processBill = async () => {
    if (!file) return;
    setLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
       const base64Str = event.target.result.split(',')[1];
       try {
         const res = await fetch('http://localhost:3000/api/user/products/scan-bill', {
             method: 'POST',
             headers: { 
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`
             },
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[1000] p-4">
       <div className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-[500px] border border-slate-100 relative shadow-2xl">
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 bg-slate-100 hover:bg-slate-200 border-none rounded-full w-8 h-8 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
          
          <h2 className="m-0 flex items-center gap-3 text-slate-800 text-xl font-extrabold tracking-tight mb-2">
              {loading ? "Analyzing Document" : (scanType === 'IN' ? 'Inbound Scanner' : 'Outbound Scanner')}
          </h2>
          {!loading && <p className="text-sm text-slate-500 m-0 mb-6 font-medium">Please select a document to upload and parse.</p>}
          
          {!scanResult && !loading && (
             <div className="mt-6 flex flex-col gap-6">
                <div className="bg-slate-50 p-10 border-2 border-dashed border-indigo-200 rounded-xl text-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-300">
                   <input type="file" id="ai-file" onChange={(e) => setFile(e.target.files[0])} className="hidden" />
                   <label htmlFor="ai-file" className="cursor-pointer flex flex-col items-center justify-center h-full w-full">
                       <div className="mb-4 text-indigo-400">
                          {scanType === 'IN' ? <Inbox size={48} strokeWidth={1.5} /> : <Flame size={48} strokeWidth={1.5} />}
                       </div>
                       <div className="text-slate-700 font-bold text-sm md:text-base break-all mb-1">
                         {file ? file.name : "Click to Select Target Data"}
                       </div>
                       <div className="text-slate-400 text-xs font-semibold tracking-wider">SUPPORTED: PNG, JPG, PDF</div>
                   </label>
                </div>
                <button 
                  className={`py-4 px-6 w-full rounded-xl text-sm font-bold flex items-center justify-center gap-2 border-none shadow-sm transition-colors ${file ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  disabled={!file} 
                  onClick={processBill}
                >
                   {scanType === 'IN' ? 'UPLOAD & PARSE INVOICE' : 'UPLOAD & PARSE RECEIPT'}
                </button>
             </div>
          )}

          {loading && (
             <div className="mt-8">
               <div className="flex items-center gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <FileText size={24} className="text-indigo-500" />
                  </div>
                  <div>
                    <h4 className="m-0 text-sm font-bold text-slate-800">Processing {file?.name || 'document'}...</h4>
                    <p className="m-0 text-xs text-slate-500 mt-1">Please wait while Gemini AI extracts data.</p>
                  </div>
               </div>

               <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-4">
                     {loadingStep >= 1 ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Loader2 size={20} className="text-slate-400 animate-spin" />}
                     <span className={`text-sm font-bold ${loadingStep >= 1 ? 'text-slate-800' : 'text-slate-400'}`}>Text extraction</span>
                  </div>
                  <div className="flex items-center gap-4">
                     {loadingStep > 1 ? <CheckCircle2 size={20} className="text-emerald-500" /> : (loadingStep === 1 ? <Loader2 size={20} className="text-indigo-500 animate-spin" /> : <Circle size={20} className="text-slate-200" />)}
                     <span className={`text-sm font-bold ${loadingStep > 1 ? 'text-slate-800' : (loadingStep === 1 ? 'text-indigo-600' : 'text-slate-400')}`}>Quantity mapping</span>
                  </div>
                  <div className="flex items-center gap-4">
                     {loadingStep > 2 ? <CheckCircle2 size={20} className="text-emerald-500" /> : (loadingStep === 2 ? <Loader2 size={20} className="text-indigo-500 animate-spin" /> : <Circle size={20} className="text-slate-200" />)}
                     <span className={`text-sm font-bold ${loadingStep > 2 ? 'text-slate-800' : (loadingStep === 2 ? 'text-indigo-600' : 'text-slate-400')}`}>Registry sync</span>
                  </div>
               </div>

               <div className="w-full bg-slate-100 h-1.5 rounded-full mt-8 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${(loadingStep / 3) * 100}%` }}></div>
               </div>
             </div>
          )}

          {scanResult && !loading && (
             <div className="mt-8">
                {scanResult.success ? (
                   <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-100 text-center flex flex-col items-center">
                       <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
                       <h3 className="m-0 text-emerald-700 text-lg font-bold mb-2">SYNC SUCCESSFUL</h3>
                       <div className="text-sm text-emerald-600 font-medium">{scanResult.parsedItems?.length || 0} items mapped to registry automatically.</div>
                   </div>
                ) : (
                   <div className="p-6 bg-red-50 rounded-xl border border-red-100 text-center flex flex-col items-center">
                       <X size={48} className="text-red-500 mb-4" />
                       <h3 className="m-0 text-red-700 text-lg font-bold mb-2">SYNC FAILED</h3>
                       <div className="text-sm text-red-600 font-medium">{scanResult.message || "Unknown AI error occurred."}</div>
                   </div>
                )}
                <button className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl py-4 px-6 w-full text-sm font-bold mt-6 cursor-pointer border-none shadow-sm transition-colors" onClick={onClose}>
                   Return to Module
                </button>
             </div>
          )}
       </div>
    </div>
  );
}

export default ScannerModal;
