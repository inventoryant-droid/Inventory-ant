import { API_BASE_URL } from '../utils/config';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Clock, User, ArrowRight, Eye, Package, Receipt, Info, 
  ChevronDown, ChevronUp, X, Download, Send, Printer, 
  ClipboardList, AlertTriangle, Check, Loader2, ChevronLeft 
} from 'lucide-react';
import '../App.css';

export default function HistoryLogs({ userId, token, userProfile, products }) {
  const containerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'scanner' | 'billing'

  // Inventory History States
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [inventoryPage, setInventoryPage] = useState(1);

  // Scanner History States
  const [scanHistory, setScanHistory] = useState([]);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerSearch, setScannerSearch] = useState('');
  const [selectedScan, setSelectedScan] = useState(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [scannerPage, setScannerPage] = useState(1);

  // Billing History States
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billingSearch, setBillingSearch] = useState('');
  const [lastBill, setLastBill] = useState(null);
  const [billingPage, setBillingPage] = useState(1);

  // Shared Toast states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

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

  // Reset pagination indexes on tab change or search queries change
  useEffect(() => {
    setInventoryPage(1);
  }, [inventorySearch]);

  useEffect(() => {
    setScannerPage(1);
  }, [scannerSearch]);

  useEffect(() => {
    setBillingPage(1);
  }, [billingSearch]);

  useEffect(() => {
    setInventoryPage(1);
    setScannerPage(1);
    setBillingPage(1);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeTab]);

  // Scroll to top of container when page changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [inventoryPage, scannerPage, billingPage]);

  // 1. Fetch Handlers
  const fetchInventoryHistory = async () => {
    if (!token) return;
    setInventoryLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/products/history`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setInventoryLogs(data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch inventory history logs:', e);
    } finally {
      setInventoryLoading(false);
    }
  };

  const fetchScanHistory = async () => {
    if (!token) return;
    setScannerLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/products/scan-history`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setScanHistory(data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch scan history logs:', e);
    } finally {
      setScannerLoading(false);
    }
  };

  const fetchBillingHistory = async () => {
    if (!token) return;
    setBillsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/products/bills`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setBills(data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch billing transactions:', e);
    } finally {
      setBillsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'inventory') fetchInventoryHistory();
    if (activeTab === 'scanner') fetchScanHistory();
    if (activeTab === 'billing') fetchBillingHistory();
  }, [activeTab, token, products]);

  // Helpers
  const getLogSourceInfo = (details) => {
    const text = (details || '').toLowerCase();
    if (text.includes('inbound scanner')) {
      return { name: 'Inbound Scanner', badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-100' };
    }
    if (text.includes('outbound scanner')) {
      return { name: 'Outbound Scanner', badgeClass: 'bg-rose-50 text-rose-700 border border-rose-100' };
    }
    if (text.includes('sales terminal') || text.includes('billing') || text.includes('sold via')) {
      return { name: 'Billing Terminal', badgeClass: 'bg-amber-50 text-amber-700 border border-amber-100' };
    }
    if (text.includes('voice command') || text.includes('smart scanner / voice')) {
      return { name: 'Voice Assistant', badgeClass: 'bg-purple-50 text-purple-700 border border-purple-100' };
    }
    if (text.includes('bulk import') || text.includes('csv file')) {
      return { name: 'CSV Import', badgeClass: 'bg-blue-50 text-blue-700 border border-blue-100' };
    }
    if (text.includes('quick register') || text.includes('manual registration')) {
      return { name: 'Manual Register', badgeClass: 'bg-slate-50 text-slate-700 border border-slate-200' };
    }
    if (text.includes('manual delete')) {
      return { name: 'Manual Delete', badgeClass: 'bg-slate-50 text-slate-700 border border-slate-200' };
    }
    return { name: 'Manual Update', badgeClass: 'bg-slate-50 text-slate-700 border border-slate-200' };
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
    });
  };

  // PDF & WhatsApp Actions for Billing
  const downloadInvoicePDF = async (bill) => {
    try {
      showSuccessToast("Generating PDF Invoice...");
      const res = await fetch(`${API_BASE_URL}/api/user/products/bills/${bill.id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to download PDF invoice");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${bill.invoiceId || bill.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showSuccessToast("Invoice PDF downloaded successfully!");
    } catch (err) {
      console.error(err);
      showErrorToast("Could not download PDF invoice.");
    }
  };

  const shareWhatsApp = async (bill) => {
    try {
      showSuccessToast("Generating PDF Invoice...");
      const res = await fetch(`${API_BASE_URL}/api/user/products/bills/${bill.id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to download PDF");
      const blob = await res.blob();
      const file = new File([blob], `Invoice_${bill.invoiceId || bill.id}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${bill.invoiceId || bill.id}`
        });
      } else {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${bill.invoiceId || bill.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showSuccessToast("PDF downloaded! Opening WhatsApp...");
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent("Please attach the downloaded PDF Invoice (Invoice_" + (bill.invoiceId || bill.id) + ".pdf) file to send it.")}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (err) {
      console.error("PDF generation/sharing failed:", err);
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent("Failed to generate PDF Invoice. Please download manually.")}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const printInvoicePDF = async (bill) => {
    try {
      showSuccessToast("Loading print preview...");
      const res = await fetch(`${API_BASE_URL}/api/user/products/bills/${bill.id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        window.open(url, '_blank');
      } else {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);

        iframe.onload = () => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => {
              document.body.removeChild(iframe);
              window.URL.revokeObjectURL(url);
            }, 3000);
          } catch (e) {
            console.error("Iframe printing failed, falling back to new tab:", e);
            window.open(url, '_blank');
          }
        };
      }
    } catch (err) {
      console.error(err);
      showErrorToast("Could not load print preview.");
    }
  };

  const handlePrint = () => {
    if (lastBill) {
      printInvoicePDF(lastBill);
    }
  };

  return (
    <div ref={containerRef} className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 text-left">
        <div>
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-emerald-600 mb-1 flex items-center gap-2">
            <Clock size={28} /> History & Audit Logs
          </h1>
          <p className="text-slate-500 text-sm font-medium m-0">
            Track stock actions, AI scans, and sale terminal transactions.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto w-full md:w-auto hide-scrollbar">
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer border-none whitespace-nowrap ${activeTab === 'inventory' ? 'bg-emerald-50 text-emerald-800' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Package size={16} /> Inventory Logs
          </button>
          <button 
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer border-none whitespace-nowrap ${activeTab === 'scanner' ? 'bg-emerald-50 text-emerald-800' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Clock size={16} /> Smart Scanner
          </button>
          <button 
            onClick={() => setActiveTab('billing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer border-none whitespace-nowrap ${activeTab === 'billing' ? 'bg-emerald-50 text-emerald-800' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Receipt size={16} /> Billing History
          </button>
        </div>
      </div>

      {/* ── 1. INVENTORY STOCK HISTORY TAB ──────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden text-left animate-in fade-in duration-200">
          <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="m-0 text-[15px] font-bold text-slate-800 flex items-center gap-2">
              <Package size={16} className="text-emerald-600" /> Audit Log History
            </h3>
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search inventory logs..." 
                value={inventorySearch} 
                onChange={e => setInventorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg outline-none transition-all placeholder-slate-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {inventoryLoading ? (
              <div className="px-6 py-12 text-center text-slate-400 text-sm">
                <Loader2 className="animate-spin inline mr-2 text-emerald-600" size={16} /> Loading inventory logs...
              </div>
            ) : (() => {
              const filteredLogs = inventoryLogs.filter(log => {
                const term = inventorySearch.toLowerCase();
                return (
                  (log.productName || '').toLowerCase().includes(term) ||
                  (log.productId || '').toLowerCase().includes(term) ||
                  (log.operatorName || '').toLowerCase().includes(term) ||
                  (log.actionType || '').toLowerCase().includes(term) ||
                  (log.details || '').toLowerCase().includes(term)
                );
              });

              if (filteredLogs.length === 0) {
                return (
                  <div className="px-6 py-12 text-center text-slate-400 text-sm">
                    No stock logs found matching your filters.
                  </div>
                );
              }

              // Pagination calculations (20 per page)
              const totalPages = Math.ceil(filteredLogs.length / 20);
              const startIndex = (inventoryPage - 1) * 20;
              const paginatedLogs = filteredLogs.slice(startIndex, startIndex + 20);

              return (
                <>
                  <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-48">Timestamp</th>
                        <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-[250px] whitespace-normal">Product</th>
                        <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-32">Action</th>
                        <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-36">Stock Change</th>
                        <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-32">Operator</th>
                        <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-40">Source</th>
                        <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold">Details</th>
                        <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold text-right w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {paginatedLogs.map((log) => {
                        let actionBadge = 'bg-slate-100 text-slate-700';
                        if (log.actionType === 'CREATE' || log.actionType === 'STOCK_IN') {
                          actionBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                        } else if (log.actionType === 'DELETE' || log.actionType === 'STOCK_OUT') {
                          actionBadge = 'bg-rose-50 text-rose-700 border border-rose-100';
                        } else if (log.actionType === 'UPDATE') {
                          actionBadge = 'bg-blue-50 text-blue-700 border border-blue-100';
                        } else if (log.actionType === 'BULK_IMPORT') {
                          actionBadge = 'bg-amber-50 text-amber-700 border border-amber-100';
                        }

                        const dateStr = formatDate(log.timestamp);
                        const sourceInfo = getLogSourceInfo(log.details);

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4.5 text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1.5"><Clock size={12} className="text-slate-400" /> {dateStr}</span>
                            </td>
                            <td className="px-6 py-4.5 text-left max-w-[250px] whitespace-normal break-words">
                              <div className="font-bold text-slate-800 text-xs">{log.productName}</div>
                              {log.productId && <div className="text-[10px] text-slate-400 mt-0.5">SKU: {log.productId}</div>}
                            </td>
                            <td className="px-6 py-4.5">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${actionBadge}`}>
                                {log.actionType}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 font-mono text-xs text-slate-600 font-bold">
                              {log.beforeQty !== null && log.afterQty !== null ? (
                                <span className="flex items-center gap-1">
                                  {log.beforeQty} <ArrowRight size={10} className="text-slate-400" /> {log.afterQty}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4.5 text-xs font-bold text-slate-600">
                              <span className="flex items-center gap-1.5"><User size={12} className="text-slate-400" /> {log.operatorName}</span>
                            </td>
                            <td className="px-6 py-4.5 text-xs font-bold">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${sourceInfo.badgeClass}`}>
                                {sourceInfo.name}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 text-xs text-slate-500 whitespace-normal max-w-xs font-medium">
                              {log.details || '-'}
                            </td>
                            <td className="px-6 py-4.5 text-right">
                              <button
                                onClick={() => setSelectedLog(log)}
                                className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-none rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 inline-flex"
                                title="View Details"
                              >
                                <Eye size={12} /> Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Pagination Controls */}
                  <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 relative min-h-[60px]">
                    <span className="text-xs text-slate-400 font-bold sm:absolute sm:left-6">
                      Showing {startIndex + 1} - {Math.min(startIndex + 20, filteredLogs.length)} of {filteredLogs.length} logs
                    </span>
                    <div className="flex items-center justify-center gap-2 mx-auto">
                      <button
                        onClick={() => setInventoryPage(p => Math.max(1, p - 1))}
                        disabled={inventoryPage === 1}
                        className={`p-2 border border-slate-200 rounded-lg flex items-center gap-1 text-xs font-bold transition-all cursor-pointer bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <ChevronLeft size={14} /> Prev
                      </button>
                      <span className="px-3 py-2 text-xs font-bold text-slate-600 select-none bg-slate-50 border border-slate-100 rounded-lg">
                        {inventoryPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setInventoryPage(p => Math.min(totalPages, p + 1))}
                        disabled={inventoryPage === totalPages}
                        className={`p-2 border border-slate-200 rounded-lg flex items-center gap-1 text-xs font-bold transition-all cursor-pointer bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        Next <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── 2. SMART SCANNER LOGS TAB ──────────────────────────────────────── */}
      {activeTab === 'scanner' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-[0_2px_10px_rgba(0,0,0,0.01)] text-left animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="m-0 text-slate-800 text-lg font-bold flex items-center gap-2">
              <Clock size={20} className="text-emerald-600" /> Scanner Audit History Logs
            </h3>
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search scanner logs..." 
                value={scannerSearch} 
                onChange={e => setScannerSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg outline-none transition-all placeholder-slate-400"
              />
            </div>
          </div>

          {scannerLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <Loader2 className="animate-spin inline mr-2 text-emerald-600" size={16} /> Loading scan history logs...
            </div>
          ) : (() => {
            const filteredScans = scanHistory.filter(scan => {
              const term = scannerSearch.toLowerCase();
              return (
                (scan.id || '').toLowerCase().includes(term) ||
                (scan.operatorName || '').toLowerCase().includes(term) ||
                (scan.actionType || '').toLowerCase().includes(term)
              );
            });

            if (filteredScans.length === 0) {
              return (
                <p className="text-slate-500 italic bg-slate-50 p-6 rounded-xl text-center border border-slate-100">
                  No invoice scans matching search logs.
                </p>
              );
            }

            // Pagination (20 per page)
            const totalPages = Math.ceil(filteredScans.length / 20);
            const startIndex = (scannerPage - 1) * 20;
            const paginatedScans = filteredScans.slice(startIndex, startIndex + 20);

            return (
              <>
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
                      {paginatedScans.map((scan) => (
                        <tr key={scan.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 pl-6 font-mono font-bold text-xs text-emerald-600">
                            {scan.id}
                          </td>
                          <td className="p-4">
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${scan.actionType === 'IN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                              {scan.actionType === 'IN' ? 'Inbound' : 'Outbound'}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-600">
                            {formatDate(scan.timestamp)}
                          </td>
                          <td className="p-4 text-xs font-bold text-slate-600">
                            {scan.operatorName || 'Owner'}
                          </td>
                          <td className="p-4 text-right pr-6">
                            <button
                              onClick={() => setSelectedScan(scan)}
                              className="py-1.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-none rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 inline-flex"
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

                {/* Pagination Controls */}
                <div className="px-6 py-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 relative min-h-[60px]">
                  <span className="text-xs text-slate-400 font-bold sm:absolute sm:left-6">
                    Showing {startIndex + 1} - {Math.min(startIndex + 20, filteredScans.length)} of {filteredScans.length} scans
                  </span>
                  <div className="flex items-center justify-center gap-2 mx-auto">
                    <button
                      onClick={() => setScannerPage(p => Math.max(1, p - 1))}
                      disabled={scannerPage === 1}
                      className={`p-2 border border-slate-200 rounded-lg flex items-center gap-1 text-xs font-bold transition-all cursor-pointer bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <span className="px-3 py-2 text-xs font-bold text-slate-600 select-none bg-slate-50 border border-slate-100 rounded-lg">
                      {scannerPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setScannerPage(p => Math.min(totalPages, p + 1))}
                      disabled={scannerPage === totalPages}
                      className={`p-2 border border-slate-200 rounded-lg flex items-center gap-1 text-xs font-bold transition-all cursor-pointer bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Next <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── 3. BILLING HISTORY TAB ─────────────────────────────────────────── */}
      {activeTab === 'billing' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 text-left animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 m-0">
              <Receipt size={22} className="text-emerald-600" /> Billing Transaction History
            </h2>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by Invoice ID or Customer Name..."
                value={billingSearch}
                onChange={e => setBillingSearch(e.target.value)}
                className="w-full py-2.5 pl-10 pr-4 text-xs text-slate-800 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {billsLoading ? (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">
              <Loader2 className="animate-spin inline mr-2 text-emerald-600" size={16} /> Loading billing transactions...
            </div>
          ) : (() => {
            const filteredBills = bills.filter(b => {
              const query = billingSearch.toLowerCase().trim();
              if (!query) return true;
              return (
                (b.id || '').toLowerCase().includes(query) ||
                (b.invoiceId || '').toLowerCase().includes(query) ||
                (b.orderId || '').toLowerCase().includes(query) ||
                (b.buyerName || '').toLowerCase().includes(query)
              );
            });

            if (filteredBills.length === 0) {
              return (
                <p className="text-slate-500 italic bg-slate-50 p-6 rounded-xl text-center border border-slate-100">
                  No billing transactions recorded yet.
                </p>
              );
            }

            // Pagination (20 per page)
            const totalPages = Math.ceil(filteredBills.length / 20);
            const startIndex = (billingPage - 1) * 20;
            const paginatedBills = filteredBills.slice(startIndex, startIndex + 20);

            return (
              <>
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
                      {paginatedBills.map(b => (
                        <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 pl-6 font-mono font-bold text-xs text-emerald-600">{b.invoiceId || b.id}</td>
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
                            <button onClick={() => setLastBill(b)} className="py-1.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-none rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 inline-flex" title="View Invoice"><Receipt size={14} /> View Invoice</button>
                            <button onClick={() => downloadInvoicePDF(b)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer transition-colors border-none inline-flex" title="Download PDF"><Download size={14} /></button>
                            <button onClick={() => shareWhatsApp(b)} className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg cursor-pointer transition-colors border-none inline-flex" title="Share on WhatsApp"><Send size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-6 py-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 relative min-h-[60px]">
                  <span className="text-xs text-slate-400 font-bold sm:absolute sm:left-6">
                    Showing {startIndex + 1} - {Math.min(startIndex + 20, filteredBills.length)} of {filteredBills.length} invoices
                  </span>
                  <div className="flex items-center justify-center gap-2 mx-auto">
                    <button
                      onClick={() => setBillingPage(p => Math.max(1, p - 1))}
                      disabled={billingPage === 1}
                      className={`p-2 border border-slate-200 rounded-lg flex items-center gap-1 text-xs font-bold transition-all cursor-pointer bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <span className="px-3 py-2 text-xs font-bold text-slate-600 select-none bg-slate-50 border border-slate-100 rounded-lg">
                      {billingPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setBillingPage(p => Math.min(totalPages, p + 1))}
                      disabled={billingPage === totalPages}
                      className={`p-2 border border-slate-200 rounded-lg flex items-center gap-1 text-xs font-bold transition-all cursor-pointer bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Next <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── MODAL: 1. INVENTORY HISTORY DETAILS ────────────────────────────── */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[1000] p-4 font-sans text-left">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-[550px] border border-slate-100 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedLog(null)} 
              className="absolute top-6 right-6 bg-slate-100 hover:bg-slate-200 border-none rounded-full w-8 h-8 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>

            <h2 className="m-0 flex items-center gap-2 text-slate-800 text-xl font-extrabold tracking-tight mb-2">
              <Package className="text-emerald-600" size={22} /> Audit Log Details
            </h2>
            <p className="text-xs text-slate-400 font-mono mb-6">LOG ID: {selectedLog.id}</p>

            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Product Details</div>
                <div className="font-extrabold text-slate-800 text-base">{selectedLog.productName}</div>
                {selectedLog.productId && (
                  <div className="text-xs text-emerald-600 font-bold mt-1 bg-emerald-50/50 px-2 py-0.5 rounded-md inline-block">
                    SKU Code: {selectedLog.productId}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Action Type</div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider inline-block mt-1 ${
                    selectedLog.actionType === 'CREATE' || selectedLog.actionType === 'STOCK_IN' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : selectedLog.actionType === 'DELETE' || selectedLog.actionType === 'STOCK_OUT'
                      ? 'bg-rose-50 text-rose-700 border border-rose-100'
                      : 'bg-blue-50 text-blue-700 border border-blue-100'
                  }`}>
                    {selectedLog.actionType}
                  </span>
                </div>

                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Channel / Source</div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider inline-block mt-1 ${
                    getLogSourceInfo(selectedLog.details).badgeClass
                  }`}>
                    {getLogSourceInfo(selectedLog.details).name}
                  </span>
                </div>

                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1"><Clock size={11} /> Timestamp</div>
                  <div className="text-xs text-slate-700 font-bold">{formatDate(selectedLog.timestamp)}</div>
                </div>

                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1"><User size={11} /> Operator</div>
                  <div className="text-xs text-slate-700 font-extrabold">{selectedLog.operatorName}</div>
                </div>
              </div>

              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3">Inventory Change</div>
                {selectedLog.beforeQty !== null && selectedLog.afterQty !== null ? (
                  <div className="flex items-center gap-6 justify-center py-2">
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400 font-bold mb-1">Before</div>
                      <div className="text-2xl font-black text-slate-400">{selectedLog.beforeQty}</div>
                    </div>
                    <ArrowRight size={20} className="text-slate-300" />
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400 font-bold mb-1">After</div>
                      <div className="text-2xl font-black text-emerald-600">{selectedLog.afterQty}</div>
                    </div>
                    <div className="border-l border-slate-200 pl-6 ml-2 text-left">
                      <div className="text-[10px] text-slate-400 font-bold mb-1">Difference</div>
                      {(() => {
                        const diff = parseInt(selectedLog.afterQty, 10) - parseInt(selectedLog.beforeQty, 10);
                        if (diff > 0) return <div className="text-xs font-extrabold text-emerald-600">+{diff} (Stock In)</div>;
                        if (diff < 0) return <div className="text-xs font-extrabold text-rose-600">{diff} (Stock Out)</div>;
                        return <div className="text-xs font-extrabold text-slate-500">0 (No Change)</div>;
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 font-bold py-2 text-center">No Stock Quantity Recorded</div>
                )}
              </div>

              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Description / Changes Logged</div>
                <div className="text-xs text-slate-600 leading-relaxed font-semibold">
                  {selectedLog.details || 'No detailed change description recorded.'}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setSelectedLog(null)} 
                className="py-2.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer border-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: 2. SMART SCANNER DETAILS ────────────────────────────────── */}
      {selectedScan && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 overflow-y-auto print-modal-overlay text-slate-800">
          <div id="printable-scan-invoice" className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 md:p-8 shadow-2xl flex flex-col gap-6">
            <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl flex justify-between items-center text-left">
              <div className="flex flex-col">
                <span className="text-emerald-600 font-extrabold text-lg uppercase tracking-wider">
                  {selectedScan.actionType === 'IN' ? 'Inbound Purchase Receipt' : 'Outbound Delivery Slip'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Scanner Audit Log Record
                </span>
              </div>
              <div className="text-right text-xs">
                <div className="font-mono font-bold text-slate-700">Ref ID: {selectedScan.id}</div>
                <div className="text-slate-400 mt-1">{formatDate(selectedScan.timestamp)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-xs">
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col gap-1">
                <strong className="text-[10px] text-slate-400 uppercase tracking-wider">Warehouse Entity</strong>
                <strong className="text-slate-800 text-sm">{userProfile?.businessName || 'test warehouse'}</strong>
                {userProfile?.businessAddress && <div className="text-slate-500">{userProfile.businessAddress}</div>}
              </div>

              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col gap-1">
                <strong className="text-[10px] text-slate-400 uppercase tracking-wider">Scan Information</strong>
                <div>Scanned By: <span className="font-bold text-emerald-600">{selectedScan.operatorName || 'Owner'}</span></div>
                <div>Status: <span className="text-emerald-600 font-bold">Processed & Synced</span></div>
              </div>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden scan-items-container max-h-[220px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
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
                    <td colSpan="2" className="p-3 text-right text-emerald-600 font-mono text-sm font-black">
                      Total Value: ₹{selectedScan.items?.reduce((acc, it) => acc + ((it.qty || 0) * parseFloat(it.mrp || 0)), 0).toFixed(2) || '0.00'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {selectedScan.auditLog && selectedScan.auditLog.length > 0 && (
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50 text-left no-print-btn">
                <button
                  onClick={() => setShowAuditLogs(!showAuditLogs)}
                  className="flex items-center justify-between w-full border-none bg-transparent cursor-pointer text-slate-700 font-bold text-xs"
                >
                  <span className="flex items-center gap-1.5">
                    <ClipboardList size={16} className="text-emerald-600" /> System Verification Audit Logs
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

            <div className="flex flex-wrap gap-3 pt-2 no-print-btn">
              <button 
                onClick={() => window.print()}
                className="flex-1 min-w-[140px] py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer border-none"
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

      {/* ── MODAL: 3. BILLING INVOICE DETAILS ──────────────────────────────── */}
      {lastBill && (() => {
        const showGst = lastBill.hasGst !== undefined ? !!lastBill.hasGst : !!userProfile?.gstNumber;
        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[1000] flex items-start justify-center p-4 overflow-y-auto print-modal-overlay md:p-8 text-slate-800">
            <div id="printable-invoice" className="rounded-2xl w-full max-w-4xl p-6 md:p-8 shadow-2xl border flex flex-col gap-6 bg-white border-slate-200">
              
              <div className="text-center flex flex-col gap-1.5 mb-2">
                <h1 className="text-2xl font-black text-[#0f9d63] uppercase m-0 tracking-wide">
                  {userProfile?.businessName || 'Warehouse'}
                </h1>
                <div className="text-xs text-slate-500 font-medium">
                  {userProfile?.businessAddress || ''} 
                  {(userProfile?.phone && userProfile?.showPhoneOnBills !== false) ? ` | Phone: ${userProfile.phone}` : ''} 
                  {(userProfile?.email && userProfile?.showEmailOnBills !== false) ? ` | Email: ${userProfile.email}` : ''}
                </div>
                {userProfile?.businessNote && (
                  <div className="bg-slate-50 border border-slate-200 rounded-full px-5 py-1 text-slate-600 font-semibold text-[10px] mx-auto mt-1 max-w-[80%] inline-block">
                    {userProfile.businessNote}
                  </div>
                )}
                {showGst && userProfile?.gstNumber && (
                  <div className="text-xs font-bold text-slate-700 mt-1">
                    GSTIN: {userProfile.gstNumber}
                  </div>
                )}
              </div>

              <div className="h-0.5 bg-[#0f9d63] my-2"></div>

              <div className="border border-slate-200 rounded-xl p-4.5 flex justify-between items-center bg-slate-50">
                <div className="flex flex-col text-left">
                  <span className="text-lg font-black text-[#0f9d63] uppercase">{showGst ? 'Tax Invoice' : 'Invoice'}</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Original for Recipient</span>
                </div>
                <div className="flex gap-8 text-xs text-left text-slate-500">
                  <div className="flex flex-col gap-1">
                    <div><strong>Order ID:</strong> <span className="font-mono text-slate-800">{lastBill.orderId || lastBill.id}</span></div>
                    <div><strong>Order Date:</strong> <span className="text-slate-800">{formatDate(lastBill.date)}</span></div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div><strong>Invoice No:</strong> <span className="font-mono text-slate-800">{lastBill.invoiceId || lastBill.id}</span></div>
                    {showGst && userProfile?.gstNumber && <div><strong>GSTIN:</strong> <span className="font-mono text-slate-800 font-bold">{userProfile.gstNumber}</span></div>}
                  </div>
                </div>
              </div>

              <div className="flex flex-row gap-4 flex-wrap">
                <div className="flex-1 min-w-[280px] border border-slate-200 rounded-xl p-4.5 flex flex-col gap-1 text-left text-xs bg-white">
                  <strong className="text-slate-400 uppercase text-[9px] tracking-wider mb-1 border-b border-slate-100 pb-1">Sold By</strong>
                  <strong className="text-sm text-slate-800">{userProfile?.businessName || 'Warehouse'}</strong>
                  <div>{userProfile?.businessAddress || ''}</div>
                  {userProfile?.phone && userProfile?.showPhoneOnBills !== false && <div>Phone: {userProfile.phone}</div>}
                </div>
                <div className="flex-1 min-w-[280px] border border-slate-200 rounded-xl p-4.5 flex flex-col gap-1 text-left text-xs bg-white">
                  <strong className="text-slate-400 uppercase text-[9px] tracking-wider mb-1 border-b border-slate-100 pb-1">Billed To</strong>
                  {lastBill.buyerName || lastBill.buyerPhone || lastBill.buyerAddress ? (
                    <>
                      <strong className="text-sm text-slate-800">{lastBill.buyerName || 'Walk-in Customer'}</strong>
                      {lastBill.buyerPhone && <div>Phone: {lastBill.buyerPhone}</div>}
                      {lastBill.buyerAddress && <div>Address: {lastBill.buyerAddress}</div>}
                    </>
                  ) : (
                    <>
                      <strong className="text-sm text-slate-800">Walk-in Customer</strong>
                      <div className="text-slate-400 italic">Retail Invoice Counter Sale</div>
                    </>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0f9d63] text-white">
                      <th className="p-3 font-bold text-left">PRODUCT</th>
                      <th className="p-3 font-bold text-left">SKU</th>
                      <th className="p-3 font-bold text-center w-20">QTY</th>
                      <th className="p-3 font-bold text-right w-32">RATE (₹)</th>
                      {showGst && <th className="p-3 font-bold text-right w-32">GST ({lastBill.subtotal > 0 ? Math.round((lastBill.gst / lastBill.subtotal) * 100) : 18}%)</th>}
                      <th className="p-3 font-bold text-right w-32">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastBill.items.map((item, idx) => {
                      const rate = parseFloat(item.salePrice || item.manualPrice || item.mrp || 0);
                      const qty = item.quantity || 1;
                      const gross = rate * qty;
                      const gstRateFactor = showGst && lastBill.subtotal > 0 ? (lastBill.gst / lastBill.subtotal) : 0;
                      const itemGst = gross * gstRateFactor;
                      const itemTotal = gross + itemGst;
                      const matchingProduct = products.find(p => p.id === item.id);
                      const skuCode = item.productId || matchingProduct?.productId || '---';
                      return (
                        <tr key={item.id || idx} className="border-b border-slate-100">
                          <td className="p-3 font-bold text-slate-800 text-left">{item.name}</td>
                          <td className="p-3 text-slate-600 font-bold font-mono text-[10px] text-left">{skuCode}</td>
                          <td className="p-3 text-center font-bold text-slate-700">{qty}</td>
                          <td className="p-3 text-right font-mono text-slate-500">₹{rate.toFixed(2)}</td>
                          {showGst && <td className="p-3 text-right text-emerald-600 font-mono">₹{itemGst.toFixed(2)}</td>}
                          <td className="p-3 text-right font-bold text-slate-800 font-mono">₹{itemTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    {showGst && (
                      <>
                        <tr className="border-t border-slate-200 bg-slate-50/50 font-bold">
                          <td colSpan={5} className="p-2 text-right text-slate-500">Subtotal:</td>
                          <td className="p-2 text-right font-mono text-slate-700">₹{lastBill.subtotal.toFixed(2)}</td>
                        </tr>
                        <tr className="bg-slate-50/50 font-bold">
                          <td colSpan={5} className="p-2 text-right text-slate-500">GST:</td>
                          <td className="p-2 text-right font-mono text-emerald-600">+₹{lastBill.gst.toFixed(2)}</td>
                        </tr>
                      </>
                    )}
                    <tr className="bg-[#0f9d63] text-white font-bold">
                      <td colSpan={showGst ? 4 : 3} className="p-3 text-left">
                        TOTAL QTY: {lastBill.items.reduce((acc, item) => acc + (item.quantity || 0), 0)}
                      </td>
                      <td colSpan={2} className="p-3 text-right text-sm">
                        TOTAL: <span className="font-mono text-base">₹{(showGst ? lastBill.total : lastBill.subtotal)?.toFixed(2)}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-end text-[10px] text-slate-400 mt-2">
                <div className="text-left leading-relaxed">
                  <strong>🐜 Powered by Inventory Ant</strong>
                  <div className="italic text-[9px]">Smart Warehouse Intelligence & Inventory System</div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="h-10 flex items-end justify-center w-[160px]">
                    {userProfile?.businessSignature && (
                      <img src={userProfile.businessSignature} alt="Signature" className="max-h-10 max-w-full object-contain" />
                    )}
                  </div>
                  <div className="border-t border-slate-200 w-[160px] text-center pt-1 text-[9px] text-slate-400">
                    Authorized Signatory
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2 no-print-btn">
                <button onClick={() => downloadInvoicePDF(lastBill)} className="flex-1 min-w-[140px] py-3 bg-[#0f9d63] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer border-none"><Download size={16} /> Download PDF</button>
                <button onClick={handlePrint} className="flex-1 min-w-[140px] py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer border-none"><Printer size={16} /> Print Receipt</button>
                <button onClick={() => shareWhatsApp(lastBill)} className="flex-1 min-w-[140px] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer border-none"><Send size={16} /> Share on WhatsApp</button>
                <button onClick={() => setLastBill(null)} className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-none"><X size={14} /> Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Shared Toast Notification */}
      <div className={`fixed bottom-6 right-1/2 translate-x-1/2 z-[2000] transition-all duration-300 transform ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className={`px-5 py-3.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex items-center gap-3 border backdrop-blur-md text-white bg-slate-900/90 border-slate-700/50`}>
          <div className={`p-1.5 rounded-full ${toastType === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            {toastType === 'error' ? <AlertTriangle size={18} /> : <Check size={18} />}
          </div>
          <span className="text-sm font-bold tracking-wide">{toastMessage}</span>
        </div>
      </div>
    </div>
  );
}
