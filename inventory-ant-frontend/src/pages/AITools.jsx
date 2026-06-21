import React, { useState, useEffect } from 'react';
import '../App.css';
import { CloudUpload, FileText, Clock, Layers, Flame, UploadCloud, Loader2, Eye, X, Printer, ClipboardList } from 'lucide-react';

function AITools({ userId, token, onScanResult, onOpenScanner, userProfile, theme }) {
  const [activeTab, setActiveTab] = useState('upload');
  const [scanHistory, setScanHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [selectedScan, setSelectedScan] = useState(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  const fetchScanHistory = async () => {
    if (!token) return;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await fetch('http://localhost:3000/api/user/products/scan-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setScanHistory(data);
      } else {
        setHistoryError('Failed to fetch scan logs.');
      }
    } catch (e) {
      setHistoryError('Network error loading history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchScanHistory();
    }
  }, [activeTab, token]);

  return (
    <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-indigo-600 mb-1">
            Smart Scanner Module
          </h1>
          <p className="text-slate-500 text-sm font-medium m-0">
            Autonomous invoice scanning & stock sync using Gemini AI.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto w-full md:w-auto hide-scrollbar">
          <button 
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer border-none whitespace-nowrap ${activeTab === 'upload' ? 'bg-indigo-50 text-indigo-600' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
          >
             <CloudUpload size={16} /> Upload
          </button>

          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer border-none whitespace-nowrap ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-600' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
          >
             <Clock size={16} /> History logs
          </button>
        </div>
      </div>

      {activeTab === 'upload' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            {/* Inbound Scanner Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-6">
                 <Layers size={32} strokeWidth={2} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 mb-3 tracking-tight">INBOUND SCANNER</h2>
              <p className="text-slate-500 text-sm mb-8 max-w-sm leading-relaxed">
                Upload purchase bills or supplier invoices. The system extracts quantities and adds to inventory automatically.
              </p>
              <button 
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors border-none cursor-pointer" 
                onClick={() => onOpenScanner('IN')}
              >
                <UploadCloud size={18} /> SELECT SUPPLIER INVOICE
              </button>
           </div>

           {/* Outbound Scanner Card */}
           <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-6">
                 <Flame size={32} strokeWidth={2} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 mb-3 tracking-tight">OUTBOUND SCANNER</h2>
              <p className="text-slate-500 text-sm mb-8 max-w-sm leading-relaxed">
                Upload sales slips, delivery challans or receipts. The system deducts quantities from inventory.
              </p>
              <button 
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors border-none cursor-pointer" 
                onClick={() => onOpenScanner('OUT')}
              >
                <UploadCloud size={18} /> SELECT DELIVERY SLIP
              </button>
            </div>
        </div>
      )}


      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-[0_2px_10px_rgba(0,0,0,0.01)] text-left mt-6">
          {/* Style injection to enable clean document printing for Scanner details */}
          <style>{`
            @media print {
              /* Hide everything by default */
              body * {
                visibility: hidden !important;
              }
              /* Render ONLY the overlay wrapper, scanner invoice container and its nested children */
              .print-modal-overlay,
              #printable-scan-invoice, 
              #printable-scan-invoice * {
                visibility: visible !important;
              }
              /* Reset modal overlay positioning and background so it is transparent and fits page */
              .print-modal-overlay {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                padding: 0 !important;
                margin: 0 !important;
                display: block !important;
                overflow: visible !important;
              }
              #printable-scan-invoice {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .no-print-btn {
                display: none !important;
              }
              @page {
                size: portrait;
                margin: 10mm;
              }
              /* Prevent parent element clipping */
              html, body, #root, #root > div {
                overflow: visible !important;
                height: auto !important;
              }
            }
          `}</style>

          <h3 className="m-0 mb-6 text-slate-800 text-lg font-bold flex items-center gap-2">
            <Clock size={20} className="text-indigo-500" /> Scanner Audit History Logs
          </h3>

          {historyLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <Loader2 className="animate-spin inline mr-2 text-indigo-500" size={16} /> Loading scan history logs...
            </div>
          ) : historyError ? (
            <div className="p-6 bg-red-50 text-red-600 rounded-xl text-xs font-semibold text-center border border-red-100">
              {historyError}
            </div>
          ) : scanHistory.length === 0 ? (
            <p className="text-slate-500 italic bg-slate-50 p-6 rounded-xl text-center border border-slate-100">
              No invoice scans recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-4 pl-6">Scan ID</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Scanned By</th>
                    <th className="p-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scanHistory.map((scan) => (
                    <tr key={scan.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 font-mono font-bold text-xs text-indigo-600">
                        {scan.id}
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${scan.actionType === 'IN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                          {scan.actionType === 'IN' ? 'Inbound' : 'Outbound'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        {new Date(scan.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-600">
                        {scan.operatorName || 'Owner'}
                      </td>
                      <td className="p-4 text-right pr-6">
                        <button
                          onClick={() => setSelectedScan(scan)}
                          className="py-1.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-none rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 inline-flex"
                          title="View Details"
                        >
                          <Eye size={14} /> View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Printable Scan Invoice Modal */}
      {selectedScan && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 overflow-y-auto print-modal-overlay">
          <div 
            id="printable-scan-invoice" 
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 text-slate-800"
          >
            {/* Header info */}
            <div style={{ border: '1px solid var(--inv-border)', borderRadius: '12px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--inv-bg-alt)' }} className="bg-slate-50 border border-slate-100">
              <div className="flex flex-col text-left">
                <span className="text-indigo-600 font-extrabold text-lg uppercase tracking-wider">
                  {selectedScan.actionType === 'IN' ? 'Inbound Purchase Receipt' : 'Outbound Delivery Slip'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Scanner Audit Log Record
                </span>
              </div>
              <div className="text-right text-xs">
                <div className="font-mono font-bold text-slate-700">Ref ID: {selectedScan.id}</div>
                <div className="text-slate-400 mt-1">{new Date(selectedScan.timestamp).toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Warehouse / Party Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-xs">
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col gap-1">
                <strong className="text-[10px] text-slate-400 uppercase tracking-wider">Warehouse Entity</strong>
                <strong className="text-slate-800 text-sm">{userProfile?.businessName || 'test warehouse'}</strong>
                {userProfile?.businessAddress && <div className="text-slate-500">{userProfile.businessAddress}</div>}
                {userProfile?.gstNumber && <div className="text-slate-500 font-mono">GSTIN: {userProfile.gstNumber}</div>}
              </div>

              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col gap-1">
                <strong className="text-[10px] text-slate-400 uppercase tracking-wider">Scan Information</strong>
                <div>Scanned By: <span className="font-bold text-indigo-600">{selectedScan.operatorName || 'Owner'}</span></div>
                <div>Status: <span className="text-emerald-600 font-bold">Processed & Synced</span></div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs" style={{ borderCollapse: 'collapse', margin: 0 }}>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Product Name</th>
                    <th className="p-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">SKU / Code</th>
                    <th className="p-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center">Qty</th>
                    <th className="p-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-right">Rate</th>
                    <th className="p-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedScan.items?.map((item, idx) => {
                    const rate = parseFloat(item.mrp || 0);
                    const qty = item.qty || 1;
                    const total = rate * qty;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <td className="p-3 text-slate-800 font-bold text-xs">{item.name}</td>
                        <td className="p-3 font-mono text-slate-500 text-[10px]">{item.productId || '---'}</td>
                        <td className="p-3 text-center text-slate-700 font-bold">{qty}</td>
                        <td className="p-3 text-right font-mono text-slate-500">₹{rate.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">₹{total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50 font-bold text-xs border-t-2 border-slate-200">
                    <td colSpan="2" className="p-3 text-slate-500 uppercase tracking-wider">Total Scanned Items: {selectedScan.items?.length || 0}</td>
                    <td className="p-3 text-center text-slate-800">{selectedScan.items?.reduce((acc, it) => acc + (it.qty || 0), 0) || 0}</td>
                    <td colSpan="2" className="p-3 text-right text-indigo-600 font-mono text-sm font-black">
                      Total Value: ₹{selectedScan.items?.reduce((acc, it) => acc + ((it.qty || 0) * parseFloat(it.mrp || 0)), 0).toFixed(2) || '0.00'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Technical Verification Section (No-Print) */}
            {selectedScan.auditLog && selectedScan.auditLog.length > 0 && (
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50 text-left no-print-btn">
                <button
                  onClick={() => setShowAuditLogs(!showAuditLogs)}
                  className="flex items-center justify-between w-full border-none bg-transparent cursor-pointer text-slate-700 font-bold text-xs"
                >
                  <span className="flex items-center gap-1.5">
                    <ClipboardList size={16} className="text-indigo-500" /> System Verification Audit Logs
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">{showAuditLogs ? 'Hide Logs ▲' : 'Show Logs ▼'}</span>
                </button>
                {showAuditLogs && (
                  <div className="mt-3 bg-slate-900 text-slate-300 p-3 rounded-lg font-mono text-[10px] leading-relaxed max-h-40 overflow-y-auto">
                    {selectedScan.auditLog.map((logLine, idx) => (
                      <div key={idx} className={logLine.startsWith('SUCCESS') || logLine.startsWith('NEW') ? 'text-emerald-400' : 'text-slate-400'}>
                        &gt; {logLine}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer / Print Actions */}
            <div className="flex flex-wrap gap-3 pt-2 no-print-btn">
              <button 
                onClick={() => window.print()}
                className="flex-1 min-w-[140px] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer border-none"
              >
                <Printer size={16} /> Print / Download PDF
              </button>
              
              <button 
                onClick={() => { setSelectedScan(null); setShowAuditLogs(false); }}
                className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-none"
              >
                <X size={14} /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AITools;
