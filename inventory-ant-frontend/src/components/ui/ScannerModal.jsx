import { API_BASE_URL } from '../../utils/config';
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import '../../App.css';
import { X, Inbox, Flame, FileText, CheckCircle2, Loader2, Circle, Camera, Trash2, Plus } from 'lucide-react';

function ScannerModal({ isOpen, onClose, scanType, userId, token, onScanSuccess, onNavigate }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);

  // New camera & review states
  const [sourceMode, setSourceMode] = useState('file'); // 'file' or 'camera'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [parsedItems, setParsedItems] = useState([]);
  const [finalSyncResult, setFinalSyncResult] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setScanResult(null);
      setLoading(false);
      setLoadingStep(0);
      setSourceMode('file');
      setCameraActive(false);
      setCameraStream(null);
      setParsedItems([]);
      setFinalSyncResult(null);
      setIsSyncing(false);
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

  const startCamera = async () => {
    try {
      setFile(null);
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      toast.error("Camera access failed. Check browser permissions.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg');
      
      const blobBin = atob(dataUrl.split(',')[1]);
      const array = [];
      for (let i = 0; i < blobBin.length; i++) {
        array.push(blobBin.charCodeAt(i));
      }
      const fileBlob = new Blob([new Uint8Array(array)], { type: 'image/jpeg' });
      const capturedFile = new File([fileBlob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      setFile(capturedFile);
      stopCamera();
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const processBill = async () => {
    if (!file) return;
    setLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
       const base64Str = event.target.result.split(',')[1];
       try {
         const res = await fetch(`${API_BASE_URL}/api/user/products/scan-bill`, {
             method: 'POST',
             headers: { 
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`
             },
             body: JSON.stringify({ 
                 fileName: file.name, 
                 fileType: file.type, 
                 base64Image: base64Str,
                 actionType: scanType,
                 parseOnly: true // Added flag to only parse the data!
             })
         });
         const data = await res.json();
         if (data.success && data.parsedItems) {
           setParsedItems(data.parsedItems);
         } else {
           setScanResult(data);
         }
       } catch (e) {
         console.error('Scan Error:', e);
         toast.error("AI server communication failed.");
       }
       setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...parsedItems];
    updated[index] = { ...updated[index], [field]: value };
    setParsedItems(updated);
  };

  const handleRemoveItem = (index) => {
    const updated = parsedItems.filter((_, i) => i !== index);
    setParsedItems(updated);
  };

  const handleAddItem = () => {
    setParsedItems([
      ...parsedItems,
      { productId: '', name: '', qty: 1, mrp: '0' }
    ]);
  };

  const confirmAndSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/products/confirm-bill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          actionType: scanType,
          items: parsedItems
        })
      });
      const data = await res.json();
      setFinalSyncResult(data);
      if (onScanSuccess) onScanSuccess();
    } catch (e) {
      console.error('Sync Error:', e);
      toast.error("Failed to sync confirmed changes.");
    }
    setIsSyncing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[1000] p-4">
        <div className={`bg-white rounded-2xl p-6 md:p-8 w-full border border-slate-100 relative shadow-2xl transition-all duration-300 ${parsedItems.length > 0 && !finalSyncResult ? 'max-w-[750px]' : 'max-w-[500px]'}`}>
           <button 
             onClick={handleClose} 
             className="absolute top-6 right-6 bg-slate-100 hover:bg-slate-200 border-none rounded-full w-8 h-8 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
           >
             <X size={18} />
           </button>
           
           <h2 className="m-0 flex items-center gap-3 text-slate-800 text-xl font-extrabold tracking-tight mb-2">
               {loading 
                 ? "Analyzing Document" 
                 : (parsedItems.length > 0 && !finalSyncResult 
                    ? "Verify Parsed Items" 
                    : (scanType === 'IN' ? 'Inbound Scanner' : 'Outbound Scanner'))}
           </h2>
           {!loading && !parsedItems.length && (
             <p className="text-sm text-slate-500 m-0 mb-6 font-medium">
               Please select a document or use your camera to capture it.
             </p>
           )}
           {parsedItems.length > 0 && !finalSyncResult && (
             <p className="text-sm text-slate-500 m-0 mb-6 font-medium">
               Review and edit the extracted details before syncing to the inventory.
             </p>
           )}
           
           {!scanResult && !loading && !parsedItems.length && (
              <div className="mt-6 flex flex-col gap-6">
                 {/* Source Selection Tabs */}
                 <div className="flex bg-slate-100 p-1.5 rounded-xl">
                    <button 
                       type="button"
                       onClick={() => { setSourceMode('file'); stopCamera(); }}
                       className={`flex-1 border-none font-bold py-2.5 px-4 rounded-lg text-sm cursor-pointer transition-all ${sourceMode === 'file' ? 'bg-white text-indigo-600 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                       File Upload
                    </button>
                    <button 
                       type="button"
                       onClick={() => { setSourceMode('camera'); startCamera(); }}
                       className={`flex-1 border-none font-bold py-2.5 px-4 rounded-lg text-sm cursor-pointer transition-all ${sourceMode === 'camera' ? 'bg-white text-indigo-600 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                       Use Camera
                    </button>
                 </div>

                 {sourceMode === 'file' && (
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
                 )}

                 {sourceMode === 'camera' && (
                    <div className="relative bg-black rounded-xl overflow-hidden min-h-[280px] flex items-center justify-center">
                       {cameraActive ? (
                          <div className="w-full h-full relative flex flex-col items-center">
                             <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                className="w-full h-[280px] object-cover"
                             />
                             <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                                <button 
                                   onClick={capturePhoto} 
                                   className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-12 h-12 flex items-center justify-center border-none shadow-md cursor-pointer transition-colors"
                                >
                                   <Camera size={22} />
                                </button>
                                <button 
                                   onClick={stopCamera} 
                                   className="bg-rose-600 hover:bg-rose-700 text-white rounded-full w-12 h-12 flex items-center justify-center border-none shadow-md cursor-pointer transition-colors"
                                >
                                   <X size={22} />
                                </button>
                             </div>
                          </div>
                       ) : (
                          <div className="text-center p-8 flex flex-col items-center gap-4">
                             {file ? (
                                <div className="flex flex-col items-center gap-2">
                                   <div className="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 max-w-[200px] truncate text-sm font-bold">
                                      {file.name}
                                   </div>
                                   <button 
                                      onClick={startCamera} 
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 px-4 text-xs font-bold border-none cursor-pointer transition-colors mt-2"
                                   >
                                      Retake Photo
                                   </button>
                                </div>
                             ) : (
                                <button 
                                   onClick={startCamera} 
                                   className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 px-6 text-sm font-bold border-none cursor-pointer transition-colors"
                                >
                                   Start Camera Feed
                                 </button>
                             )}
                          </div>
                       )}
                       <canvas ref={canvasRef} className="hidden" />
                    </div>
                 )}

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
              <div className="mt-8 text-slate-700">
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

           {/* ── Verification & Edit Card List ── */}
           {parsedItems.length > 0 && !finalSyncResult && !loading && (
              <div className="mt-2 flex flex-col gap-0">
                 {/* Header bar */}
                 <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                       <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold">
                          {parsedItems.length}
                       </span>
                       <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Items Parsed — Review Before Syncing
                       </span>
                    </div>
                    <button
                       type="button"
                       onClick={handleAddItem}
                       className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 bg-transparent cursor-pointer transition-all"
                    >
                       <Plus size={12} /> Add Row
                    </button>
                 </div>

                 {/* Column labels */}
                 <div className="grid grid-cols-[2rem_1fr_5rem_5rem_2.5rem] gap-2 px-3 pb-1.5 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">#</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Product Name</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">Stock Qty</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">{scanType === 'IN' ? 'Cost Price' : 'Price'}</span>
                    <span></span>
                 </div>

                 {/* Scrollable card list */}
                 <div className="max-h-[340px] overflow-y-auto flex flex-col gap-1 py-1 pr-0.5 custom-scrollbar">
                    {parsedItems.map((item, idx) => (
                       <div
                          key={idx}
                          className="group grid grid-cols-[2rem_1fr_5rem_5rem_2.5rem] gap-2 items-center px-3 py-2.5 rounded-xl
                             bg-white dark:bg-slate-800/60
                             border border-slate-100 dark:border-slate-700/60
                             hover:border-indigo-200 dark:hover:border-indigo-700/60
                             hover:shadow-sm transition-all duration-200"
                       >
                          {/* Row number badge */}
                          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-extrabold shrink-0">
                             {idx + 1}
                          </span>

                          {/* Product name input */}
                          <input
                             type="text"
                             value={item.name || ''}
                             onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                             placeholder="Product name..."
                             className="w-full min-w-0 bg-transparent border-0 border-b border-transparent
                                group-hover:border-slate-200 dark:group-hover:border-slate-600
                                focus:border-indigo-400 dark:focus:border-indigo-500
                                text-sm font-semibold text-slate-800 dark:text-slate-100
                                placeholder:text-slate-300 dark:placeholder:text-slate-600
                                focus:outline-none py-0.5 transition-colors truncate"
                          />

                          {/* Stock qty input */}
                          <input
                             type="number"
                             value={item.qty || ''}
                             onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value, 10) || 0)}
                             placeholder="0"
                             className="w-full bg-slate-50 dark:bg-slate-700/60
                                border border-slate-200 dark:border-slate-600
                                focus:border-indigo-400 dark:focus:border-indigo-500
                                text-xs font-bold text-slate-700 dark:text-slate-200
                                focus:outline-none rounded-lg px-2 py-1.5 text-center
                                transition-colors"
                          />

                          {/* Price input */}
                          <input
                             type="text"
                             value={item.mrp || ''}
                             onChange={(e) => handleItemChange(idx, 'mrp', e.target.value)}
                             placeholder={scanType === 'IN' ? 'Cost Price' : '0.00'}
                             className="w-full bg-slate-50 dark:bg-slate-700/60
                                border border-slate-200 dark:border-slate-600
                                focus:border-indigo-400 dark:focus:border-indigo-500
                                text-xs font-bold text-slate-700 dark:text-slate-200
                                focus:outline-none rounded-lg px-2 py-1.5 text-center
                                transition-colors"
                          />

                          {/* Delete button */}
                          <button
                             type="button"
                             onClick={() => handleRemoveItem(idx)}
                             className="w-7 h-7 flex items-center justify-center rounded-lg
                                text-slate-300 dark:text-slate-600
                                hover:text-rose-500 dark:hover:text-rose-400
                                hover:bg-rose-50 dark:hover:bg-rose-900/20
                                bg-transparent border-none cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                          >
                             <Trash2 size={14} />
                          </button>
                       </div>
                    ))}
                 </div>

                 {/* Action footer */}
                 <div className="flex flex-col sm:flex-row gap-2.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                    <button
                       type="button"
                       onClick={() => { setParsedItems([]); setFile(null); }}
                       className="bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700
                          text-slate-700 dark:text-slate-300
                          rounded-xl py-3 px-5 flex-1 text-sm font-bold cursor-pointer border-none transition-colors"
                    >
                       ← Re-Scan
                    </button>
                    <button
                       type="button"
                       disabled={isSyncing || parsedItems.length === 0}
                       onClick={confirmAndSync}
                       className={`flex-1 rounded-xl py-3 px-5 text-sm font-bold border-none cursor-pointer
                          transition-all shadow-md flex items-center justify-center gap-2
                          ${isSyncing
                             ? 'bg-indigo-400 dark:bg-indigo-600 text-white cursor-wait opacity-80'
                             : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-200 dark:shadow-indigo-900/40'
                          }`}
                    >
                       {isSyncing ? (
                          <><Loader2 size={16} className="animate-spin" /> Syncing...</>
                       ) : (
                          <><CheckCircle2 size={16} /> Confirm &amp; Sync to Inventory</>
                       )}
                    </button>
                 </div>
              </div>
           )}


           {/* Final Sync Completion Screen */}
            {finalSyncResult && !loading && (
               <div className="mt-8">
                  {finalSyncResult.success ? (
                     <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-100 text-center flex flex-col items-center">
                         <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
                         <h3 className="m-0 text-emerald-700 text-lg font-bold mb-2">SYNC SUCCESSFUL</h3>
                         <div className="text-sm text-emerald-600 font-medium mb-4">{finalSyncResult.parsedItems?.length || 0} items mapped and saved to inventory.</div>
                         
                         {/* Detailed Sync Summary */}
                         {finalSyncResult.syncResults && finalSyncResult.syncResults.length > 0 && (
                            <div className="w-full text-left bg-white border border-slate-100 rounded-xl p-3 shadow-inner">
                               <h4 className="m-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Detailed Sync Summary</h4>
                               <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                                  {finalSyncResult.syncResults.map((res, index) => (
                                     <div key={index} className="p-2.5 rounded-lg border border-slate-50 bg-slate-50/50 flex flex-col gap-1 text-[11px]">
                                        <div className="flex items-center justify-between gap-2">
                                           <span className="font-semibold text-slate-800 truncate" title={res.name}>
                                              {res.name}
                                           </span>
                                           <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold shrink-0 ${
                                              res.status === 'NEW' 
                                                 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                                 : res.status === 'NEW_OUTBOUND'
                                                 ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                                 : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                           }`}>
                                              {res.status === 'NEW' ? 'NEW ITEM' : res.status === 'NEW_OUTBOUND' ? 'NEW (OUT)' : 'UPDATED'}
                                           </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500 font-medium">
                                           <span>SKU Code: <strong className="text-slate-700">{res.productId || 'N/A'}</strong></span>
                                           {res.csvRow && <span>CSV Row: <strong className="text-slate-700">{res.csvRow}</strong></span>}
                                           <span>Change: <strong className={res.status === 'SUCCESS' ? 'text-indigo-600' : 'text-emerald-600'}>{scanType === 'IN' ? '+' : '-'}{res.qty}</strong></span>
                                           <span>Total Stock: <strong className="text-slate-700">{res.newQty}</strong></span>
                                        </div>
                                     </div>
                                  ))}
                               </div>
                            </div>
                         )}
                     </div>
                  ) : (
                     <div className="p-6 bg-red-50 rounded-xl border border-red-100 text-center flex flex-col items-center">
                         <X size={48} className="text-red-500 mb-4" />
                         <h3 className="m-0 text-red-700 text-lg font-bold mb-2">SYNC FAILED</h3>
                         <div className="text-sm text-red-600 font-medium">{finalSyncResult.message || "Unknown error occurred."}</div>
                     </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                     <button 
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3.5 px-6 flex-1 text-sm font-bold cursor-pointer border-none transition-colors" 
                        onClick={() => onNavigate ? onNavigate('dashboard') : onClose()}
                     >
                        Go to Overview
                     </button>
                     <button 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3.5 px-6 flex-1 text-sm font-bold cursor-pointer border-none shadow-sm transition-colors" 
                        onClick={() => onNavigate ? onNavigate('inventory') : onClose()}
                     >
                        Go to Master Inventory
                     </button>
                  </div>
               </div>
            )}

           {scanResult && !loading && !parsedItems.length && (
              <div className="mt-8">
                 {scanResult.success ? (
                    <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-100 text-center flex flex-col items-center">
                        <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
                        <h3 className="m-0 text-emerald-700 text-lg font-bold mb-2">SYNC SUCCESSFUL</h3>
                        <div className="text-sm text-emerald-600 font-medium">{scanResult.parsedItems?.length || 0} items mapped to registry.</div>
                    </div>
                 ) : (
                    <div className="p-6 bg-red-50 rounded-xl border border-red-100 text-center flex flex-col items-center">
                        <X size={48} className="text-red-500 mb-4" />
                        <h3 className="m-0 text-red-700 text-lg font-bold mb-2">ANALYSIS FAILED</h3>
                        <div className="text-sm text-red-600 font-medium">{scanResult.message || "Unknown AI error occurred."}</div>
                    </div>
                 )}
                 <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    {!scanResult.success ? (
                       <>
                          <button 
                             className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3.5 px-6 flex-1 text-sm font-bold cursor-pointer border-none transition-colors" 
                             onClick={() => { setScanResult(null); setFile(null); }}
                          >
                             Retry Scan 🔄
                          </button>
                          <button 
                             className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3.5 px-6 flex-1 text-sm font-bold cursor-pointer border-none shadow-sm transition-colors" 
                             onClick={() => onNavigate ? onNavigate('inventory') : onClose()}
                          >
                             Go to Inventory
                          </button>
                       </>
                    ) : (
                       <>
                          <button 
                             className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3.5 px-6 flex-1 text-sm font-bold cursor-pointer border-none transition-colors" 
                             onClick={() => onNavigate ? onNavigate('dashboard') : onClose()}
                          >
                             Go to Overview
                          </button>
                          <button 
                             className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3.5 px-6 flex-1 text-sm font-bold cursor-pointer border-none shadow-sm transition-colors" 
                             onClick={() => onNavigate ? onNavigate('inventory') : onClose()}
                          >
                             Go to Master Inventory
                          </button>
                       </>
                    )}
                 </div>
              </div>
           )}
        </div>
    </div>
  );
}

export default ScannerModal;

