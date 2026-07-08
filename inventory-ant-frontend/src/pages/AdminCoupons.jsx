import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Tag, Plus, Trash2, Edit3, Search, RefreshCw, Loader2, 
  Percent, DollarSign, Calendar, Users, Info, ToggleLeft, ToggleRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../utils/config';
import '../App.css';

export default function AdminCoupons() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  // Form states
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' | 'fixed'
  const [discountValue, setDiscountValue] = useState(10);
  const [maximumDiscount, setMaximumDiscount] = useState('');
  const [minimumAmount, setMinimumAmount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [planId, setPlanId] = useState('');
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0]);
  const [validTill, setValidTill] = useState('');
  const [active, setActive] = useState(true);

  // 1. FETCH COUPONS
  const { data: coupons, isLoading, error, refetch } = useQuery({
    queryKey: ['adminCouponsList'],
    queryFn: () => fetch(`${API_BASE_URL}/api/admin/coupons`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('ant_token')}` }
    }).then(res => res.json()),
  });

  // 2. FETCH PLANS
  const { data: plans } = useQuery({
    queryKey: ['adminPlansList'],
    queryFn: () => fetch(`${API_BASE_URL}/api/subscription/plans`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('ant_token')}` }
    }).then(res => res.json()),
  });

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('ant_token')}`
  });

  // 3. CREATE COUPON
  const createMutation = useMutation({
    mutationFn: (newCpn) => fetch(`${API_BASE_URL}/api/admin/coupons`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(newCpn)
    }).then(res => {
      if (!res.ok) return res.json().then(e => { throw new Error(e.message || 'Create failed'); });
      return res.json();
    }),
    onSuccess: () => {
      toast.success('Discount coupon created');
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['adminCouponsList'] });
    },
    onError: (err) => toast.error(err.message)
  });

  // 4. UPDATE COUPON
  const updateMutation = useMutation({
    mutationFn: ({ id, fields }) => fetch(`${API_BASE_URL}/api/admin/coupons/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(fields)
    }).then(res => {
      if (!res.ok) return res.json().then(e => { throw new Error(e.message || 'Update failed'); });
      return res.json();
    }),
    onSuccess: () => {
      toast.success('Coupon updated successfully');
      setEditingCoupon(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['adminCouponsList'] });
    },
    onError: (err) => toast.error(err.message)
  });

  // 5. DELETE COUPON
  const deleteMutation = useMutation({
    mutationFn: (id) => fetch(`${API_BASE_URL}/api/admin/coupons/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(res => {
      if (!res.ok) return res.json().then(e => { throw new Error(e.message || 'Delete failed'); });
      return res.json();
    }),
    onSuccess: () => {
      toast.success('Coupon deleted');
      queryClient.invalidateQueries({ queryKey: ['adminCouponsList'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const resetForm = () => {
    setCode('');
    setDiscountType('percentage');
    setDiscountValue(10);
    setMaximumDiscount('');
    setMinimumAmount('');
    setUsageLimit('');
    setPlanId('');
    setValidFrom(new Date().toISOString().split('T')[0]);
    setValidTill('');
    setActive(true);
  };

  const handleEditClick = (cpn) => {
    setEditingCoupon(cpn);
    setCode(cpn.code);
    setDiscountType(cpn.discountType);
    setDiscountValue(cpn.discountValue);
    setMaximumDiscount(cpn.maximumDiscount !== null ? String(cpn.maximumDiscount) : '');
    setMinimumAmount(cpn.minimumAmount !== null ? String(cpn.minimumAmount) : '');
    setUsageLimit(cpn.usageLimit !== null ? String(cpn.usageLimit) : '');
    setPlanId(cpn.planId || '');
    setValidFrom(new Date(cpn.validFrom).toISOString().split('T')[0]);
    setValidTill(cpn.validTill ? new Date(cpn.validTill).toISOString().split('T')[0] : '');
    setActive(cpn.active !== false);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      code: code.toUpperCase().trim(),
      discountType,
      discountValue: Number(discountValue),
      maximumDiscount: maximumDiscount ? Number(maximumDiscount) : null,
      minimumAmount: minimumAmount ? Number(minimumAmount) : null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      planId: planId || null,
      validFrom: new Date(validFrom).toISOString(),
      validTill: validTill ? new Date(validTill).toISOString() : new Date(Date.now() + 365*24*60*60*1000).toISOString(),
      active
    });
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      id: editingCoupon.id,
      fields: {
        code: code.toUpperCase().trim(),
        discountType,
        discountValue: Number(discountValue),
        maximumDiscount: maximumDiscount ? Number(maximumDiscount) : null,
        minimumAmount: minimumAmount ? Number(minimumAmount) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        planId: planId || null,
        validFrom: new Date(validFrom).toISOString(),
        validTill: validTill ? new Date(validTill).toISOString() : new Date(Date.now() + 365*24*60*60*1000).toISOString(),
        active
      }
    });
  };

  // Preview Discount Savings
  const discountPreviewText = useMemo(() => {
    if (discountType === 'percentage') {
      return `Preview: Subtracts ${discountValue}% from matching plan amounts (capped at ${maximumDiscount ? `₹${maximumDiscount}` : 'Unlimited'}).`;
    }
    return `Preview: Subtracts flat ₹${discountValue} from plan invoices (requires min total ₹${minimumAmount || '0'}).`;
  }, [discountType, discountValue, maximumDiscount, minimumAmount]);

  const filteredCoupons = coupons?.filter(c => 
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6 animate-pulse bg-slate-50 text-left">
        <div className="h-10 bg-slate-200 rounded-lg w-48" />
        <div className="h-64 bg-white border rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 flex-1 overflow-y-auto space-y-6 text-left relative">
      
      {/* ─── CREATE / EDIT COUPON MODALS ─── */}
      {(isCreateOpen || editingCoupon) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={isCreateOpen ? handleCreateSubmit : handleUpdateSubmit} 
            className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-4 shadow-2xl text-left max-h-[90vh] overflow-y-auto"
          >
            <h3 className="m-0 text-base font-extrabold text-slate-800">
              {isCreateOpen ? 'Create Discount Coupon' : `Update Coupon: ${editingCoupon?.code}`}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Coupon Promo Code</label>
                <input type="text" placeholder="WINTER20" value={code} onChange={e => setCode(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Discount Formula</label>
                <select value={discountType} onChange={e => setDiscountType(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none">
                  <option value="percentage">Percentage Discount (%)</option>
                  <option value="fixed">Fixed Price Amount (Flat)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Value (Value or Flat price)</label>
                <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Min Order Limit Amount</label>
                <input type="number" placeholder="Optional" value={minimumAmount} onChange={e => setMinimumAmount(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Max Discount Limit Cap</label>
                <input type="number" placeholder="Optional" value={maximumDiscount} onChange={e => setMaximumDiscount(e.target.value)} disabled={discountType === 'fixed'} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none disabled:opacity-40" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Usage Limit Count</label>
                <input type="number" placeholder="Optional" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Plan Restrictions</label>
              <select value={planId} onChange={e => setPlanId(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none">
                <option value="">No Restrictions (All Plans)</option>
                {plans?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Valid From</label>
                <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Valid Till (Expiry)</label>
                <input type="date" value={validTill} onChange={e => setValidTill(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-xs" />
              </div>
            </div>

            {/* Discount Preview display box */}
            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-start gap-2 text-emerald-800 text-[11px] font-medium leading-relaxed">
              <Info size={14} className="shrink-0 mt-0.5" />
              <p className="m-0">{discountPreviewText}</p>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 pt-2">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
              Is Active (Redeemable)
            </label>

            <div className="flex gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => { setIsCreateOpen(false); setEditingCoupon(null); resetForm(); }} 
                className="flex-1 py-3 bg-slate-100 rounded-xl text-xs font-bold border-none cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer"
              >
                Create Coupon
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="m-0 text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
            <Tag className="text-indigo-600" /> Coupon Management
          </h2>
          <span className="text-xs text-slate-400 font-bold font-mono">Create discount promotions, restrict to plan types, valid timelines, and track limits.</span>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer flex items-center gap-1.5"
        >
          <Plus size={14} /> Create Coupon
        </button>
      </div>

      {/* SEARCH COUNTERS */}
      <div className="bg-white border rounded-2xl p-4 flex gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search promo code..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl outline-none text-sm"
          />
        </div>
      </div>

      {/* COUPONS TABLE LIST */}
      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead className="bg-slate-50 border-b text-slate-400 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-4">Coupon Code</th>
                <th className="p-4">Discount</th>
                <th className="p-4">Capped Limit</th>
                <th className="p-4">Plan restriction</th>
                <th className="p-4 text-center">Redeemed</th>
                <th className="p-4">Validity Range</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCoupons?.map(cpn => {
                const expired = cpn.validTill && new Date(cpn.validTill) < new Date();
                return (
                  <tr key={cpn.id} className="hover:bg-slate-50 font-medium text-slate-700">
                    <td className="p-4 font-mono font-bold text-slate-800">{cpn.code}</td>
                    <td className="p-4">{cpn.discountType === 'percentage' ? `${cpn.discountValue}%` : `₹${cpn.discountValue}`}</td>
                    <td className="p-4">{cpn.maximumDiscount ? `₹${cpn.maximumDiscount}` : 'Unlimited'}</td>
                    <td className="p-4 capitalize">{cpn.plan?.name || 'All Plans'}</td>
                    <td className="p-4 text-center font-bold text-slate-800">{cpn.usedCount} {cpn.usageLimit ? `/ ${cpn.usageLimit}` : ''}</td>
                    <td className="p-4 text-xs font-mono">{new Date(cpn.validFrom).toLocaleDateString()} to {new Date(cpn.validTill).toLocaleDateString()}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        expired ? 'bg-amber-100 text-amber-800' : cpn.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {expired ? 'Expired' : cpn.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleEditClick(cpn)} 
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 border-none bg-transparent cursor-pointer"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => { if(confirm('Delete coupon?')) deleteMutation.mutate(cpn.id); }}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 hover:text-rose-700 border-none bg-transparent cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
