import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminService } from '../services/adminService';
import { 
  FileText, Search, RotateCcw, Eye, X, Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PageSkeleton, PageError, EmptyState, StatusBadge, SectionHeader } from '../components/ui/SharedUI';
import '../App.css';

export default function AdminPayments() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'success' | 'refunded'
  const [selectedTxn, setSelectedTxn] = useState(null); // Detailed view

  // 1. FETCH TRANSACTIONS
  const { data: payments, isLoading, error, refetch } = useQuery({
    queryKey: ['adminPaymentsList'],
    queryFn: AdminService.getPayments,
    staleTime: 10000,
  });

  // 2. REFUND MUTATION
  const refundMutation = useMutation({
    mutationFn: (txnId) => AdminService.refundPayment(txnId),
    onSuccess: () => {
      toast.success('Transaction refunded successfully');
      queryClient.invalidateQueries({ queryKey: ['adminPaymentsList'] });
      setSelectedTxn(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Refund request failed');
    }
  });

  const handleRefund = (txnId) => {
    if (confirm('Confirm refund transaction?')) {
      refundMutation.mutate(txnId);
    }
  };

  const filteredPayments = payments?.filter(p => {
    const matchesSearch = p.userId.toLowerCase().includes(search.toLowerCase()) || 
                          p.id.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  });

  if (isLoading) return <PageSkeleton rows={2} cols={3} />;
  if (error) return <PageError message="Could not load payment gateway logs." onRetry={refetch} />;

  return (
    <div className="p-6 md:p-8 bg-slate-50 flex-1 overflow-y-auto space-y-6 text-left relative">
      
      {/* ─── PAYMENT DETAILS MODAL ─── */}
      {selectedTxn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="m-0 text-base font-extrabold text-slate-800">Transaction Details</h3>
                <span className="text-[10px] text-slate-400 font-mono block">ID: {selectedTxn.id}</span>
              </div>
              <button onClick={() => setSelectedTxn(null)} className="p-1 hover:bg-slate-100 rounded text-slate-400 border-none bg-transparent cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Tenant Account:</span>
                <span className="font-bold text-slate-800">{selectedTxn.userId}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Business Name:</span>
                <span className="font-bold text-slate-800">{selectedTxn.businessName}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">SaaS Plan Tier:</span>
                <span className="font-bold text-slate-800 uppercase">{selectedTxn.plan}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="font-bold text-slate-800">₹{selectedTxn.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Invoice Number:</span>
                <span className="font-mono text-slate-800">{selectedTxn.invoiceId || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Transaction Status:</span>
                <span className="font-bold uppercase text-slate-800">{selectedTxn.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Billing Date:</span>
                <span className="font-bold text-slate-800">{new Date(selectedTxn.timestamp).toLocaleString()}</span>
              </div>
            </div>

            {selectedTxn.status === 'success' && (
              <div className="pt-4 flex gap-2">
                <button 
                  onClick={() => handleRefund(selectedTxn.id)}
                  disabled={refundMutation.isPending}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {refundMutation.isPending && <Loader2 className="animate-spin" size={12} />}
                  <RotateCcw size={12} /> Issue Refund
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HEADER */}
      <SectionHeader
        title="Payment Gateway Logs"
        subtitle="Monitor Razorpay payments, issue refunds and verify transaction records."
        icon={FileText}
      />

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border p-4 rounded-2xl shadow-sm">
        <div className="relative md:col-span-2">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search transactions by ID or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl outline-none text-sm"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'success', 'refunded'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer capitalize ${
                statusFilter === f 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions list */}
      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead className="bg-slate-50 border-b text-slate-400 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-4">Txn ID</th>
                <th className="p-4">Tenant Email</th>
                <th className="p-4">Plan Name</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments?.map(txn => (
                <tr key={txn.id} className="hover:bg-slate-50 font-medium text-slate-700">
                  <td className="p-4 font-mono font-bold text-slate-800">{txn.id}</td>
                  <td className="p-4">{txn.userId}</td>
                  <td className="p-4 uppercase">{txn.plan}</td>
                  <td className="p-4 text-right font-bold text-slate-800">₹{txn.amount.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      txn.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {txn.status}
                    </span>
                  </td>
                  <td className="p-4">{new Date(txn.timestamp).toLocaleDateString()}</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => setSelectedTxn(txn)}
                        className="py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold border-none cursor-pointer transition-colors inline-flex items-center gap-1"
                      >
                        <Eye size={12} /> Details
                      </button>
                      {txn.status === 'success' && (
                        <button 
                          onClick={() => handleRefund(txn.id)}
                          className="py-1 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold border border-rose-100 cursor-pointer transition-colors inline-flex items-center gap-1"
                        >
                          <RotateCcw size={12} /> Refund
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
