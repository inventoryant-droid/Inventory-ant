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
  
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'business' | 'security' | 'preferences' | 'notifications'

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
  // TAB 1 & 2: PROFILE & BUSINESS FORM STATES
  // ==========================================
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [logoBase64, setLogoBase64] = useState('');
  const [signatureBase64, setSignatureBase64] = useState('');
  const [showPhoneOnBills, setShowPhoneOnBills] = useState(true);
  const [showEmailOnBills, setShowEmailOnBills] = useState(true);

  // Initialize from userProfile prop
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setPhone(userProfile.phone || '');
      setBusinessName(userProfile.businessName || '');
      setBusinessAddress(userProfile.businessAddress || '');
      setGstNumber(userProfile.gstNumber || '');
      setLogoBase64(userProfile.businessLogo || '');
      setSignatureBase64(userProfile.businessSignature || '');
      setShowPhoneOnBills(userProfile.showPhoneOnBills !== false);
      setShowEmailOnBills(userProfile.showEmailOnBills !== false);
      
      // Load local preferences from localStorage
      const tz = localStorage.getItem('ant_pref_timezone');
      const cur = localStorage.getItem('ant_pref_currency');
      if (tz) setTimezone(tz);
      if (cur) setCurrency(cur);
    }
  }, [userProfile]);

  // Update Profile Mutation
  const [profileSaving, setProfileSaving] = useState(false);

  const handleUpdateProfile = async (e) => {
    if (e) e.preventDefault();
    setProfileSaving(true);
    
    // Save local preferences
    localStorage.setItem('ant_pref_timezone', timezone);
    localStorage.setItem('ant_pref_currency', currency);

    try {
      const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          phone,
          businessName,
          businessAddress,
          gstNumber,
          businessLogo: logoBase64,
          businessSignature: signatureBase64,
          showPhoneOnBills,
          showEmailOnBills,
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Profile update failed');
      
      toast.success('Settings updated successfully');
      if (onProfileUpdate) onProfileUpdate();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  // Image Upload helpers
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setLogoBase64(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setSignatureBase64(event.target.result);
    reader.readAsDataURL(file);
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
        let nameIdx = -1, qtyIdx = -1, priceIdx = -1, costIdx = -1;
        firstRow.forEach((val, i) => {
          const v = String(val).toLowerCase().trim();
          if (v.includes('name') || v.includes('product')) nameIdx = i;
          if (v.includes('qty') || v.includes('stock') || v.includes('quantity')) qtyIdx = i;
          if (v.includes('price') || v.includes('mrp') || v.includes('sale')) priceIdx = i;
          if (v.includes('cost') || v.includes('purchase')) costIdx = i;
        });

        if (nameIdx === -1) nameIdx = 0;
        if (qtyIdx === -1) qtyIdx = 1;
        if (priceIdx === -1) priceIdx = 2;

        const mapped = rawRows.slice(1).map((row, i) => ({
          productId: `SKU-${Date.now()}-${i}`,
          name: row[nameIdx] || `Item-${i}`,
          quantity: String(row[qtyIdx] || '0').replace(/,/g, '').trim(),
          mrp: String(row[priceIdx] || '0').replace(/,/g, '').trim(),
          costPrice: costIdx !== -1 ? String(row[costIdx] || '0').replace(/,/g, '').trim() : '0',
          _timestamp: Date.now(),
        }));

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
            { id: 'profile', label: 'User Profile', icon: <User size={16} /> },
            { id: 'business', label: 'Business info', icon: <Building size={16} /> },
            { id: 'security', label: 'Security & 2FA', icon: <Shield size={16} /> },
            { id: 'preferences', label: 'Data Management', icon: <PrefIcon size={16} /> },
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
          
          {/* ─── TAB 1: PROFILE ─── */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <h3 className="m-0 text-base font-extrabold text-slate-800 border-b pb-3 flex items-center gap-2">
                <User size={18} className="text-emerald-500" /> User Profile Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Owner Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none text-xs sm:text-sm font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Mobile Phone</label>
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none text-xs sm:text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">System Timezone</label>
                  <select 
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none text-xs sm:text-sm font-medium"
                  >
                    <option value="Asia/Kolkata">India (IST) - UTC +5:30</option>
                    <option value="America/New_York">United States (EST) - UTC -5:00</option>
                    <option value="Europe/London">London (GMT) - UTC +0:00</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Base Currency</label>
                  <select 
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none text-xs sm:text-sm font-medium"
                  >
                    <option value="INR">Indian Rupee (₹)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="GBP">British Pound (£)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  type="submit" 
                  disabled={profileSaving}
                  className="py-3 px-6 bg-[#0f9d63] hover:bg-emerald-700 disabled:bg-[#0f9d63]/75 text-white font-bold text-xs rounded-xl border-none cursor-pointer flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  {profileSaving && <Loader2 className="animate-spin" size={12} />} Save Changes
                </button>
              </div>
            </form>
          )}

          {/* ─── TAB 2: BUSINESS INFO ─── */}
          {activeTab === 'business' && (
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <h3 className="m-0 text-base font-extrabold text-slate-800 border-b pb-3 flex items-center gap-2">
                <Building size={18} className="text-emerald-500" /> B2B Entity Configuration
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Registered Business Name</label>
                  <input 
                    type="text" 
                    value={businessName} 
                    onChange={e => setBusinessName(e.target.value)}
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none text-xs sm:text-sm font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">GST Registration Number</label>
                  <input 
                    type="text" 
                    value={gstNumber} 
                    onChange={e => setGstNumber(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none text-xs sm:text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Registered Business Address</label>
                <textarea 
                  rows={2}
                  value={businessAddress}
                  onChange={e => setBusinessAddress(e.target.value)}
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none text-xs sm:text-sm font-medium"
                />
              </div>

              {/* Logo and Signature upload segment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2 text-left">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Brand Business Logo</span>
                  {logoBase64 ? (
                    <div className="relative w-32 h-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center p-2">
                      <img src={logoBase64} className="max-w-full max-h-full object-contain" alt="Logo" />
                      <button 
                        type="button" 
                        onClick={() => setLogoBase64('')}
                        className="absolute top-1 right-1 p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded border-none cursor-pointer"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => logoInputRef.current.click()}
                      className="w-32 h-20 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center text-slate-400 cursor-pointer transition-colors"
                    >
                      <UploadCloud size={20} />
                      <span className="text-[9px] font-bold mt-1">Upload Logo</span>
                    </div>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </div>

                <div className="space-y-2 text-left">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Authorized Signature (Signatory)</span>
                  {signatureBase64 ? (
                    <div className="relative w-32 h-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center p-2">
                      <img src={signatureBase64} className="max-w-full max-h-full object-contain" alt="Signature" />
                      <button 
                        type="button" 
                        onClick={() => setSignatureBase64('')}
                        className="absolute top-1 right-1 p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded border-none cursor-pointer"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => signatureInputRef.current.click()}
                      className="w-32 h-20 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center text-slate-400 cursor-pointer transition-colors"
                    >
                      <UploadCloud size={20} />
                      <span className="text-[9px] font-bold mt-1">Upload Sign</span>
                    </div>
                  )}
                  <input ref={signatureInputRef} type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  type="submit" 
                  disabled={profileSaving}
                  className="py-3 px-6 bg-[#0f9d63] hover:bg-emerald-700 text-white font-bold text-xs rounded-xl border-none cursor-pointer flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  {profileSaving && <Loader2 className="animate-spin" size={12} />} Save Details
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
