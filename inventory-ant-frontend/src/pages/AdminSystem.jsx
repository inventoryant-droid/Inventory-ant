import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminService } from '../services/adminService';
import { 
  Terminal, HardDrive, RefreshCw, HelpCircle, Cpu, Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../utils/config';
import { PageSkeleton, PageError, SectionHeader } from '../components/ui/SharedUI';
import '../App.css';

export default function AdminSystem() {
  const queryClient = useQueryClient();
  const [impersonationEmail, setImpersonationEmail] = useState('');
  
  // Quick payment override states
  const [overrideEmail, setOverrideEmail] = useState('');
  const [overrideAmount, setOverrideAmount] = useState(2999);
  const [overridePlan, setOverridePlan] = useState('pro');

  // Announcement Broadcast states
  const [annTarget, setAnnTarget] = useState('all');
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');

  // 1. FETCH SYSTEM STATUS METRIC HANDSHAKES
  const { data: status, isLoading, error, refetch } = useQuery({
    queryKey: ['adminSystemStatus'],
    queryFn: AdminService.getSystemStatus,
    staleTime: 5000,
  });

  // 2. FETCH PRICING PLANS
  const { data: plans } = useQuery({
    queryKey: ['plansList'],
    queryFn: () => fetch(`${API_BASE_URL}/api/subscription/plans`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('ant_token')}` }
    }).then(res => res.json()),
  });

  // 3. ADD PAYMENT MUTATION
  const addPaymentMutation = useMutation({
    mutationFn: ({ email, amount, plan }) => fetch(`${API_BASE_URL}/api/admin/payments/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ant_token')}`,
      },
      body: JSON.stringify({ email, amount, plan })
    }).then(res => res.json()),
    onSuccess: () => {
      toast.success('Mock manual transaction order synchronized');
      setOverrideEmail('');
      queryClient.invalidateQueries({ queryKey: ['adminPaymentsList'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Payment link mapping failed');
    }
  });

  const handleImpersonate = (e) => {
    e.preventDefault();
    if (!impersonationEmail) return;
    toast.success(`Impersonating ${impersonationEmail} session placeholder active.`);
  };

  const handleAddPaymentOverride = (e) => {
    e.preventDefault();
    addPaymentMutation.mutate({
      email: overrideEmail,
      amount: Number(overrideAmount),
      plan: overridePlan
    });
  };

  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();
    if (!annTitle || !annMessage) {
      toast.error('Title and message are required');
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ant_token')}`,
        },
        body: JSON.stringify({
          target: annTarget,
          title: annTitle,
          message: annMessage
        })
      });
      
      if (res.ok) {
        toast.success(`Announcement broadcasted to ${annTarget.toUpperCase()} successfully!`);
        setAnnTitle('');
        setAnnMessage('');
      } else {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to broadcast announcement');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (isLoading) return <PageSkeleton rows={2} cols={2} />;
  if (error) return <PageError message="Could not fetch system status." onRetry={refetch} />;

  const dbSizes = status?.dbSizes || {};
  const memory = status?.memory || {};

  return (
    <div className="p-6 md:p-8 bg-slate-50 flex-1 overflow-y-auto space-y-6 text-left relative">
      
      {/* HEADER */}
      <SectionHeader
        title="System Tools & Support"
        subtitle="Simulate user impersonation, inject payment receipts, and check active database file sizes."
        icon={Terminal}
        action={
          <button onClick={() => refetch()} aria-label="Refresh system status" className="p-2 border rounded-xl bg-white hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <RefreshCw size={16} />
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Support tools columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* User impersonation */}
          <div className="bg-white border rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="m-0 text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <HelpCircle className="text-indigo-600" /> Impersonate User Session
            </h3>
            <p className="text-slate-500 text-xs m-0">Log in securely as the B2B user to verify inventory discrepancies or scan logs.</p>
            <form onSubmit={handleImpersonate} className="flex gap-2">
              <input 
                type="email"
                placeholder="user@email.com"
                value={impersonationEmail}
                onChange={e => setImpersonationEmail(e.target.value)}
                required
                className="flex-1 p-2.5 bg-slate-50 border rounded-xl outline-none text-xs"
              />
              <button type="submit" className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer">
                Impersonate
              </button>
            </form>
          </div>

          {/* Quick Payment Assignment */}
          <div className="bg-white border rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="m-0 text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Zap className="text-indigo-600" /> Manual Payment Override
            </h3>
            <p className="text-slate-500 text-xs m-0">Synchronize manually received offline wire transfer receipts to active accounts.</p>
            <form onSubmit={handleAddPaymentOverride} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input 
                type="email" 
                placeholder="User Email" 
                value={overrideEmail}
                onChange={e => setOverrideEmail(e.target.value)}
                required
                className="p-2.5 bg-slate-50 border rounded-xl outline-none text-xs"
              />
              <input 
                type="number" 
                value={overrideAmount}
                onChange={e => setOverrideAmount(e.target.value)}
                required
                className="p-2.5 bg-slate-50 border rounded-xl outline-none text-xs"
              />
              <button 
                type="submit" 
                className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold border-none cursor-pointer flex items-center justify-center gap-1"
              >
                Sync Receipt
              </button>
            </form>
          </div>

          {/* Announcement Broadcast Center */}
          <div className="bg-white border rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="m-0 text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Zap className="text-indigo-600" /> Announcement Broadcast Center
            </h3>
            <p className="text-slate-500 text-xs m-0">Send global announcements or notifications to selected subscription tiers.</p>
            <form onSubmit={handleAnnouncementSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={annTarget}
                  onChange={e => setAnnTarget(e.target.value)}
                  className="p-2.5 bg-slate-50 border rounded-xl outline-none text-xs"
                >
                  <option value="all">All Users</option>
                  <option value="free">Free Plan Users</option>
                  <option value="basic">Basic Plan Users</option>
                  <option value="pro">Pro Plan Users</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Announcement Title" 
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  required
                  className="p-2.5 bg-slate-50 border rounded-xl outline-none text-xs sm:col-span-2"
                />
              </div>
              <textarea 
                placeholder="Announcement Message" 
                value={annMessage}
                onChange={e => setAnnMessage(e.target.value)}
                required
                rows={3}
                className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-xs resize-none"
              />
              <button 
                type="submit" 
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer flex items-center justify-center gap-1 transition-colors"
              >
                Broadcast Announcement
              </button>
            </form>
          </div>
        </div>

        {/* Database files size & queues */}
        <div className="space-y-6">
          <div className="bg-white border rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="m-0 text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <HardDrive className="text-indigo-600" /> Database File Sizes
            </h3>

            <div className="space-y-3 text-xs">
              {[
                { label: 'User Directory', size: dbSizes.users },
                { label: 'Products Inventory', size: dbSizes.database },
                { label: 'Bills Transactions', size: dbSizes.bills },
                { label: 'Audit Handshakes Logs', size: dbSizes.logs },
                { label: 'Announcements bulletins', size: dbSizes.notifications },
              ].map((db, idx) => (
                <div key={idx} className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-500">{db.label}:</span>
                  <span className="font-bold font-mono text-slate-800">{(db.size / 1024).toFixed(2)} KB</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="m-0 text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Cpu className="text-indigo-600" /> Process Handshake
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Uptime:</span>
                <span className="font-bold text-slate-800">{(status.uptime / 3600).toFixed(2)} hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Heap Used:</span>
                <span className="font-bold text-slate-800">{(memory.heapUsed / (1024 * 1024)).toFixed(1)} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Node Environment:</span>
                <span className="font-mono text-indigo-600 font-bold">{status.nodeVersion}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
