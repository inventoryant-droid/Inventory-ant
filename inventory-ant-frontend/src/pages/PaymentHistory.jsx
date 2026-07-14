import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PaymentService } from '../services/paymentService';
import { 
  CreditCard, FileText, Download, Printer, Share2, X, CheckCircle2, 
  AlertTriangle, RefreshCw, Eye, Percent, ArrowUpRight, DollarSign, Calendar
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import '../App.css';

export default function PaymentHistory({ userProfile, isMerged = false }) {
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // 1. FETCH BILLING HISTORY VIA REACT QUERY
  const { data: historyData, isLoading, error, refetch } = useQuery({
    queryKey: ['billingHistory'],
    queryFn: PaymentService.getBillingHistory,
    staleTime: 20000,
  });

  const handlePrint = async () => {
    if (!selectedInvoice) return;
    try {
      toast.loading('Preparing document for print...', { id: 'print-pdf' });
      const blob = await PaymentService.downloadInvoicePdf(selectedInvoice.id);
      const url = URL.createObjectURL(blob);
      toast.dismiss('print-pdf');
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.focus();
      } else {
        toast.error('Pop-up blocked. Please enable pop-ups to print.');
      }
    } catch (err) {
      toast.dismiss('print-pdf');
      toast.error('Failed to prepare document for printing.');
    }
  };

  const handleDownloadSaas = async (invoice) => {
    try {
      toast.loading('Downloading invoice PDF...', { id: 'download-pdf' });
      const blob = await PaymentService.downloadInvoicePdf(invoice.id);
      const url = URL.createObjectURL(blob);
      toast.dismiss('download-pdf');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber || 'Invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Invoice PDF downloaded successfully!');
    } catch (err) {
      toast.dismiss('download-pdf');
      toast.error('Failed to download invoice PDF.');
    }
  };

  const handleShare = (invoice) => {
    const text = `Invoice #${invoice.id}\nPlan: ${invoice.planName} (${invoice.billingCycle})\nTotal Paid: ₹${invoice.amount}\nStatus: ${invoice.status}\nInventory Ant B2B SaaS`;
    navigator.clipboard.writeText(text);
    toast.success('Invoice details copied to clipboard!');
  };

  // 2. SKELETON LOADING
  if (isLoading) {
    return (
      <div className="p-4 md:p-8 flex-1 overflow-y-auto space-y-6 animate-pulse bg-[#F8FAFC]">
        <div className="h-10 bg-slate-200 rounded-lg w-48 text-left" />
        <div className="h-96 bg-white border border-slate-200 rounded-3xl" />
      </div>
    );
  }

  // 3. ERROR RENDERING
  if (error) {
    return (
      <div className="p-4 md:p-8 flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] text-center min-h-[500px]">
        <AlertTriangle size={48} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Failed to load billing history</h2>
        <p className="text-slate-500 text-sm mt-2">Could not retrieve invoice transaction logs.</p>
        <button 
          onClick={() => refetch()}
          className="mt-6 py-2.5 px-6 bg-[#0f9d63] hover:bg-emerald-700 text-white rounded-xl text-sm font-bold border-none cursor-pointer flex items-center gap-2"
        >
          <RefreshCw size={16} /> Retry Logs
        </button>
      </div>
    );
  }

  return (
    <div className={isMerged ? "space-y-6 text-left relative" : "p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC] space-y-6 text-left relative"}>
      
      {/* ─── OVERLAY INVOICE VIEWER ─── */}
      <AnimatePresence>
        {selectedInvoice && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* Printable Invoice Container */}
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-6 text-left max-h-[90vh] overflow-y-auto print:p-0 print:shadow-none print:max-h-none">
              
              {/* Header Details */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 print:border-b-2">
                <div className="space-y-1">
                  <h3 className="m-0 text-xl font-black text-slate-800">TAX INVOICE</h3>
                  <span className="text-[10px] text-slate-400 font-mono block">Invoice ID: #{selectedInvoice.id}</span>
                  <span className="text-[10px] text-slate-400 font-mono block">Payment ID: {selectedInvoice.paymentId}</span>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <button 
                    onClick={() => handleDownloadSaas(selectedInvoice)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 border-none bg-transparent cursor-pointer"
                    title="Download PDF"
                  >
                    <Download size={16} />
                  </button>
                  <button 
                    onClick={handlePrint}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 border-none bg-transparent cursor-pointer"
                    title="Print"
                  >
                    <Printer size={16} />
                  </button>
                  <button 
                    onClick={() => handleShare(selectedInvoice)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 border-none bg-transparent cursor-pointer"
                    title="Share"
                  >
                    <Share2 size={16} />
                  </button>
                  <button 
                    onClick={() => setSelectedInvoice(null)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 border-none bg-transparent cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Company Branding & Tenant billing Address */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Billed By</span>
                  <strong className="text-slate-800 text-sm">Inventory Ant Ltd.</strong>
                  <p className="text-slate-500 m-0 leading-relaxed">
                    Smart warehouse intelligence, Block-C<br />
                    Industrial Sector-62, Noida, India<br />
                    GSTIN: 09AAHCI4530P1Z2
                  </p>
                </div>
                <div className="space-y-2 text-right">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Billed To</span>
                  <strong className="text-slate-800 text-sm">{userProfile?.businessName || 'Business Owner'}</strong>
                  <p className="text-slate-500 m-0 leading-relaxed">
                    {userProfile?.name || 'Partner'}<br />
                    {userProfile?.businessAddress || 'Address not configured'}<br />
                    {userProfile?.gstNumber ? `GSTIN: ${userProfile.gstNumber}` : 'GSTIN: N/A'}
                  </p>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="font-bold text-slate-500">
                      <th className="p-3">SaaS Item Details</th>
                      <th className="p-3 text-center">Billing Cycle</th>
                      <th className="p-3 text-right">Base Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 font-medium">
                      <td className="p-3">
                        <strong>{selectedInvoice.planName} Plan</strong><br />
                        <span className="text-slate-400 text-[10px]">Access to automated POS billing, smart scanner uploads, and staff management tools.</span>
                      </td>
                      <td className="p-3 text-center capitalize">{selectedInvoice.billingCycle}</td>
                      <td className="p-3 text-right">₹{((selectedInvoice.amount - selectedInvoice.gst) + selectedInvoice.discount).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total calculations */}
              <div className="flex justify-end text-xs">
                <div className="w-64 space-y-2 text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal Price:</span>
                    <span className="font-bold text-slate-800">₹{((selectedInvoice.amount - selectedInvoice.gst) + selectedInvoice.discount).toFixed(2)}</span>
                  </div>
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span className="flex items-center gap-1"><Percent size={12} /> Coupon Discount ({selectedInvoice.couponCode}):</span>
                      <span className="font-bold">-₹{selectedInvoice.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST (18%):</span>
                    <span className="font-bold text-slate-800">₹{selectedInvoice.gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-800 text-sm">
                    <span>Total Amount Paid:</span>
                    <span>₹{selectedInvoice.amount.toLocaleString()} {selectedInvoice.currency || 'INR'}</span>
                  </div>
                </div>
              </div>

              {/* Printable Invoice footer sign */}
              <div className="grid grid-cols-2 gap-4 text-xs pt-8 border-t border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400">Created At</span>
                  <p className="m-0 font-bold">{new Date(selectedInvoice.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] text-slate-400 block">Authorized Signatory</span>
                  <div className="w-24 h-6 border-b border-slate-300 ml-auto" />
                  <p className="m-0 text-[10px] text-slate-400 pt-1">Powered by Inventory Ant Ltd.</p>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <div>
        <h1 className="m-0 text-3xl font-extrabold tracking-tight text-emerald-600">
          Billing History & Invoices
        </h1>
        <p className="text-slate-500 text-sm font-medium mt-1 m-0">
          Review subscription invoices, transaction statuses, and print receipts.
        </p>
      </div>

      {/* INVOICES LIST TABLE */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr className="font-bold">
                <th className="p-4">Invoice ID</th>
                <th className="p-4">Plan Name</th>
                <th className="p-4">Billing Cycle</th>
                <th className="p-4">Coupon</th>
                <th className="p-4 text-right">Paid Amount</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4">Created Date</th>
                <th className="p-4 text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyData && historyData.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50/50 font-medium text-slate-700">
                  <td className="p-4 font-mono">#{invoice.id.slice(0, 8)}</td>
                  <td className="p-4 font-bold text-slate-800">{invoice.planName}</td>
                  <td className="p-4 capitalize">{invoice.billingCycle}</td>
                  <td className="p-4">{invoice.couponCode ? (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {invoice.couponCode}
                    </span>
                  ) : '-'}</td>
                  <td className="p-4 text-right font-bold text-slate-800">₹{invoice.amount.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      invoice.status === 'success' || invoice.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {invoice.status === 'void' || invoice.status === 'refunded' ? 'REFUNDED' : invoice.status}
                    </span>
                  </td>
                  <td className="p-4">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-center print:hidden">
                    {invoice.status !== 'void' && invoice.status !== 'refunded' && (
                      <button 
                        onClick={() => setSelectedInvoice(invoice)}
                        className="py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold border-none cursor-pointer transition-colors inline-flex items-center gap-1"
                      >
                        <Eye size={12} /> View Invoice
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!historyData || historyData.length === 0) && (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <DollarSign className="mx-auto text-slate-300" size={36} />
            <p className="m-0 text-sm font-medium">No subscription invoices logged.</p>
          </div>
        )}
      </div>

    </div>
  );
}
