import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubscriptionService } from '../services/subscriptionService';
import Papa from 'papaparse';
import PasswordInput from '../components/ui/PasswordInput';
import { 
  User, Building, Shield, Settings as PrefIcon, Bell, 
  UploadCloud, Trash2, Camera, Key, Check, AlertTriangle, 
  Loader2, Globe, DollarSign, Laptop, LogOut, CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../utils/config';
import '../App.css';

export default function Settings({ userId, token, onScanResult, userRole, userProfile, onProfileUpdate }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const signatureInputRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'security' | 'preferences' | 'notifications'

  if (userRole === 'staff') {
    return (
      <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC]">
        <div className="flex flex-col mb-8 text-left">
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-[#ef4444]">Access Restricted</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Staff members are not authorized to view settings.</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // INVENTORY PREFERENCES STATE
  // ==========================================
  const [lowStockThreshold, setLowStockThreshold] = useState(20);

  // Initialize from userProfile prop
  useEffect(() => {
    if (userProfile && userProfile.lowStockThreshold !== undefined && userProfile.lowStockThreshold !== null) {
      setLowStockThreshold(Number(userProfile.lowStockThreshold));
    }
  }, [userProfile]);

  // Update Threshold Mutation
  const [profileSaving, setProfileSaving] = useState(false);

  const handleUpdateThreshold = async (e) => {
    if (e) e.preventDefault();
    setProfileSaving(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lowStockThreshold: Number(lowStockThreshold),
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      
      toast.success('Low stock threshold updated successfully');
      if (onProfileUpdate) onProfileUpdate(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  // ==========================================
  // TAB 3: SECURITY (PASSWORD CHANGE & SESSIONS)
  // ==========================================
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [enable2FA, setEnable2FA] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      toast.error('New passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPass, newPass })
      });
      if (res.ok) {
        toast.success('Password updated successfully');
        setOldPass('');
        setNewPass('');
        setConfirmPass('');
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to update password');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setPasswordLoading(false);
    }
  };

  // ==========================================
  // TAB 4: PREFERENCES (CSV & WIPE CATALOG)
  // ==========================================
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [wipePassword, setWipePassword] = useState('');
  const [isWiping, setIsWiping] = useState(false);

  const executeWipeCatalog = async () => {
    if (!wipePassword) {
      toast.error('Password is required to wipe catalog');
      return;
    }
    setIsWiping(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/products/all?password=${encodeURIComponent(wipePassword)}`, { 
        method: 'DELETE', 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      if (res.ok) {
        toast.success('Your inventory catalog has been wiped clean');
        setShowConfirmPopup(false);
        setWipePassword('');
        onScanResult();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Wipe failed. Invalid password.');
      }
    } catch(e) {
      toast.error('Network Error');
    } finally {
      setIsWiping(false);
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: async function(results) {
        const rawRows = results.data;
        if (rawRows.length === 0) {
          toast.error("File is empty");
          return;
        }

        const firstRow = rawRows[0];
        let nameIdx = -1, qtyIdx = -1, priceIdx = -1, costIdx = -1, skuIdx = -1;
        firstRow.forEach((val, i) => {
          const v = String(val).toLowerCase().trim();
          if (v.includes('sku') || v.includes('code') || v === 'id' || v === 'productid' || v === 'product_id') {
            skuIdx = i;
          } else if (v.includes('name') || v.includes('desc') || v.includes('product') || v.includes('item')) {
            nameIdx = i;
          } else if (v.includes('qty') || v.includes('stock') || v.includes('quantity')) {
            qtyIdx = i;
          } else if (v.includes('price') || v.includes('mrp') || v.includes('sale') || v.includes('rate')) {
            priceIdx = i;
          } else if (v.includes('cost') || v.includes('purchase')) {
            costIdx = i;
          }
        });

        if (nameIdx === -1) nameIdx = 0;
        if (qtyIdx === -1) qtyIdx = 1;
        if (priceIdx === -1) priceIdx = 2;

        const mapped = rawRows.slice(1).map((row, i) => {
          const rawSku = skuIdx !== -1 ? String(row[skuIdx] || '').trim() : '';
          return {
            productId: rawSku,
            name: row[nameIdx] || `Item-${i}`,
            quantity: String(row[qtyIdx] || '0').replace(/,/g, '').trim(),
            mrp: String(row[priceIdx] || '0').replace(/,/g, '').trim(),
            costPrice: costIdx !== -1 ? String(row[costIdx] || '0').replace(/,/g, '').trim() : '0',
            _timestamp: Date.now(),
          };
        });

        toast('Sending parsed items to server...', { icon: '📦' });
        try {
          const res = await fetch(`${API_BASE_URL}/api/user/products/bulk`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(mapped)
          });
          if (res.ok) {
            toast.success('Successfully imported CSV catalog list');
            if (onScanResult) onScanResult();
          } else {
            toast.error('Bulk sync rejected by server');
          }
        } catch (err) {
          toast.error('Upload timeout');
        }
      }
    });
  };

  // ==========================================
  // TAB 5: NOTIFICATIONS CONFIG
  // ==========================================
  const [notifyConfig, setNotifyConfig] = useState({
    emailAlerts: true,
    aiAlerts: true,
    renewalReminders: true,
    paymentAlerts: true,
    marketing: false,
  });

  const handleNotifyToggle = (key) => {
    const updated = { ...notifyConfig, [key]: !notifyConfig[key] };
    setNotifyConfig(updated);
    localStorage.setItem('ant_notify_config', JSON.stringify(updated));
    toast.success('Notification preferences updated');
  };

  useEffect(() => {
    const saved = localStorage.getItem('ant_notify_config');
    if (saved) {
      try {
        setNotifyConfig(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  return (
    <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC] space-y-6 text-left">
      
      {/* HEADER PANELS */}
      <div>
        <h1 className="m-0 text-3xl font-extrabold tracking-tight text-emerald-600">
          Account Settings
        </h1>
        <p className="text-slate-500 text-sm font-medium mt-1 m-0">
          Configure B2B settings, security rules, connected accounts and bulk operations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Side Tab Navigation */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-row lg:flex-col gap-1 overflow-x-auto">
          {[
            { id: 'inventory', label: 'Inventory Preferences', icon: <PrefIcon size={16} /> },
            { id: 'security', label: 'Security & 2FA', icon: <Shield size={16} /> },
            { id: 'preferences', label: 'Data Management', icon: <Trash2 size={16} /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-2 w-full shrink-0 justify-start ${
                activeTab === tab.id 
                  ? 'bg-emerald-50 text-emerald-700 font-extrabold' 
                  : 'bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Right Side Panel Content */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
          
          {/* ─── TAB: INVENTORY PREFERENCES ─── */}
          {activeTab === 'inventory' && (
            <form onSubmit={handleUpdateThreshold} className="space-y-6">
              <h3 className="m-0 text-base font-extrabold text-slate-800 border-b pb-3 flex items-center gap-2">
                <PrefIcon size={18} className="text-emerald-500" /> Inventory Preferences
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Low Stock Alert Threshold</label>
                  <input 
                    type="number" 
                    min="1"
                    value={lowStockThreshold} 
                    onChange={e => setLowStockThreshold(e.target.value)}
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none text-xs sm:text-sm font-medium"
                  />
                  <p className="text-[10px] text-slate-400 m-0">Products with stock at or below this limit will trigger low stock alerts.</p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  type="submit" 
                  disabled={profileSaving}
                  className="py-3 px-6 bg-[#0f9d63] hover:bg-emerald-700 disabled:bg-[#0f9d63]/75 text-white font-bold text-xs rounded-xl border-none cursor-pointer flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  {profileSaving && <Loader2 className="animate-spin" size={12} />} Save Preferences
                </button>
              </div>
            </form>
          )}

          {/* ─── TAB 3: SECURITY (PASSWORD & 2FA) ─── */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              
              {/* Password update form */}
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <h3 className="m-0 text-base font-extrabold text-slate-800 border-b pb-3 flex items-center gap-2">
                  <Key size={18} className="text-emerald-500" /> Change Account Password
                </h3>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Current Password</label>
                    <PasswordInput 
                      placeholder="••••••••" 
                      value={oldPass} 
                      onChange={e => setOldPass(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">New Password</label>
                      <PasswordInput 
                        placeholder="••••••••" 
                        value={newPass} 
                        onChange={e => setNewPass(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Confirm Password</label>
                      <PasswordInput 
                        placeholder="••••••••" 
                        value={confirmPass} 
                        onChange={e => setConfirmPass(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    type="submit" 
                    disabled={passwordLoading || !newPass}
                    className="py-3 px-6 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-bold text-xs rounded-xl border-none cursor-pointer transition-colors"
                  >
                    {passwordLoading && <Loader2 className="animate-spin" size={12} />} Update Password
                  </button>
                </div>
              </form>

              {/* Connected accounts & 2FA Placeholders */}
              <div className="border-t pt-6 space-y-6">
                <h4 className="m-0 text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Shield size={16} className="text-emerald-500" /> Identity Protection
                </h4>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="font-bold text-slate-800 block text-xs sm:text-sm">Two-Factor Authentication (2FA)</span>
                    <span className="text-slate-400 text-[11px] mt-0.5 block">Use Google Authenticator OTP code on logins.</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={enable2FA}
                    onChange={(e) => {
                      setEnable2FA(e.target.checked);
                      if (e.target.checked) toast.success('2FA OTP code registration window simulated.');
                    }}
                    className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 rounded cursor-pointer"
                  />
                </div>

                {/* Active Sessions List */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Active Sessions logs</span>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                    <div className="p-3 text-xs flex justify-between items-center bg-slate-50">
                      <span className="font-bold flex items-center gap-2"><Laptop size={14} className="text-[#0f9d63]" /> Chrome on Windows (Current)</span>
                      <span className="text-slate-400 text-[10px]">127.0.0.1 • India</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ─── TAB 4: PREFERENCES & CATALOG DATA ─── */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              
              {/* Wipe catalog segment */}
              <div className="space-y-4">
                <h3 className="m-0 text-base font-extrabold text-slate-800 border-b pb-3 flex items-center gap-2">
                  <Trash2 size={18} className="text-rose-500" /> Wipe Catalog Database
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed m-0">
                  Deleting your inventory database is irreversible. All products, quantities, history entries, and transactions will be cleared.
                </p>
                <div>
                  {showConfirmPopup ? (
                    <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl space-y-3">
                      <span className="text-[10px] uppercase font-black text-rose-700 block">Confirm Password to Wipe Catalog</span>
                      <div className="flex gap-2">
                        <input 
                          type="password"
                          placeholder="Password"
                          value={wipePassword}
                          onChange={e => setWipePassword(e.target.value)}
                          className="flex-1 p-2 border border-rose-300 rounded-xl outline-none"
                        />
                        <button 
                          onClick={executeWipeCatalog}
                          disabled={isWiping}
                          className="py-2 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer flex items-center gap-1"
                        >
                          {isWiping && <Loader2 className="animate-spin" size={12} />} Yes, Wipe All
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowConfirmPopup(true)}
                      className="py-3 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl border-none cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Wipe Inventory Catalog
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk import catalog CSV */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="m-0 text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <UploadCloud size={18} className="text-emerald-500" /> Bulk Catalog Import (.csv)
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed m-0">
                  Import inventory catalog products using standard formatted CSV columns. Sl No, Product Description, Quantity, Selling Price.
                </p>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border-none cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <UploadCloud size={14} /> Select CSV File
                </button>
              </div>

            </div>
          )}

          {/* ─── TAB 5: NOTIFICATIONS CONFIG ─── */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="m-0 text-base font-extrabold text-slate-800 border-b pb-3 flex items-center gap-2">
                <Bell size={18} className="text-emerald-500" /> Subscription Preferences
              </h3>

              <div className="space-y-4">
                {[
                  { key: 'emailAlerts', title: 'Email Billing Notifications', desc: 'Receive invoices, receipts, and order confirmations via email.' },
                  { key: 'aiAlerts', title: 'AI Assistant Quotas Alert', desc: 'Notify me when monthly AI Chat / voice commands usage reaches 80% limit.' },
                  { key: 'renewalReminders', title: 'Plan Expiry & Renewal Reminders', desc: 'Send alerts 15 days before plans renewal dates.' },
                  { key: 'paymentAlerts', title: 'Payment Gateways Alert', desc: 'Warn on transaction delays or card failure refunds.' },
                  { key: 'marketing', title: 'Marketing Communications', desc: 'Notify about new modules, feature rollouts and discount codes.' },
                ].map(({ key, title, desc }) => (
                  <div key={key} className="flex items-start justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                    <div className="text-left">
                      <span className="font-bold text-slate-800 block text-xs sm:text-sm">{title}</span>
                      <span className="text-slate-400 text-[11px] mt-0.5 block">{desc}</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={notifyConfig[key]}
                      onChange={() => handleNotifyToggle(key)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 rounded cursor-pointer mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
