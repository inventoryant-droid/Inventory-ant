import React, { useState, useRef } from 'react';
import { Upload, X, Building, Mail, Phone, MapPin, Check, LogOut, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import '../App.css';

export default function OnboardingScreen({ token, userProfile, onProfileCompleted, onLogout, theme }) {
  const fileInputRef = useRef(null);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [email, setEmail] = useState(userProfile.email || '');
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [gstNumber, setGstNumber] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [showPhoneOnBills, setShowPhoneOnBills] = useState(true);
  const [showEmailOnBills, setShowEmailOnBills] = useState(true);
  const [logoBase64, setLogoBase64] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file formats
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Supported formats: JPG, PNG, WEBP only.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoBase64(event.target.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoBase64('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Verification
    if (!businessName.trim()) {
      setError('Business Name is required.');
      return;
    }
    if (!businessType.trim()) {
      setError('Business Type is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email Address is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone Number is required.');
      return;
    }
    if (!businessAddress.trim()) {
      setError('Business Address is required.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: userProfile.name,
          email,
          phone,
          businessName,
          businessType,
          businessLogo: logoBase64,
          gstNumber,
          businessAddress,
          showPhoneOnBills,
          showEmailOnBills,
          profileCompleted: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Profile setup failed. Please try again.');
      }

      onProfileCompleted(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Server communication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 md:p-8 ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-[#f1f5f9]'}`}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 md:p-10 shadow-2xl flex flex-col gap-6 transition-all">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm animate-pulse">
            <Sparkles size={32} />
          </div>
          <h1 className="m-0 text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            Complete Business Profile
          </h1>
          <p className="text-slate-400 dark:text-slate-500 mt-2 text-sm max-w-md">
            Please fill in your company details to set up your billing invoices, reports, and initialize warehouse access.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 text-rose-600 dark:text-rose-400 text-sm font-semibold p-4 rounded-xl flex items-center gap-2">
            <X size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Logo upload row */}
          <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row items-center gap-5">
            <div className="w-20 h-20 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
              {logoBase64 ? (
                <img src={logoBase64} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Building size={32} className="text-slate-400 dark:text-slate-600" />
              )}
            </div>
            <div className="flex flex-col gap-1 items-center sm:items-start text-center sm:text-left flex-1">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Business Logo / Profile Photo</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Supported formats: JPG, PNG, WEBP (Optional)</span>
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".jpg,.jpeg,.png,.webp" 
                  onChange={handleLogoUpload} 
                  className="hidden" 
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current.click()} 
                  className="py-1.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-lg text-xs font-bold border-none transition-colors cursor-pointer"
                >
                  {logoBase64 ? 'Update Logo' : 'Upload Logo'}
                </button>
                {logoBase64 && (
                  <button 
                    type="button" 
                    onClick={handleRemoveLogo} 
                    className="py-1.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 rounded-lg text-xs font-bold border-none transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Business Name */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Building size={14} className="text-indigo-500" /> Business Name <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="e.g. Acme Warehouse Ltd" 
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none text-slate-800 dark:text-white focus:border-indigo-500 transition-colors text-sm"
                required
              />
            </div>

            {/* Business Type */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-500" /> Business Type <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="e.g. Retail, Wholesale, Manufacturing" 
                value={businessType}
                onChange={e => setBusinessType(e.target.value)}
                className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none text-slate-800 dark:text-white focus:border-indigo-500 transition-colors text-sm"
                required
              />
            </div>

            {/* GST Number */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-indigo-500" /> GST Number (Optional)
              </label>
              <input 
                type="text" 
                placeholder="e.g. 22AAAAA0000A1Z5" 
                value={gstNumber}
                onChange={e => setGstNumber(e.target.value)}
                className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none text-slate-800 dark:text-white focus:border-indigo-500 transition-colors text-sm"
              />
            </div>

            {/* Email Address */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Mail size={14} className="text-indigo-500" /> Email Address <span className="text-rose-500">*</span>
              </label>
              <input 
                type="email" 
                placeholder="e.g. contact@business.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none text-slate-800 dark:text-white focus:border-indigo-500 transition-colors text-sm"
                required
              />
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Phone size={14} className="text-indigo-500" /> Phone Number <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="e.g. +91 9876543210" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none text-slate-800 dark:text-white focus:border-indigo-500 transition-colors text-sm"
                required
              />
            </div>
          </div>

          {/* Business Address */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <MapPin size={14} className="text-indigo-500" /> Business Address <span className="text-rose-500">*</span>
            </label>
            <textarea 
              placeholder="e.g. 102, Warehouse Lane, Sector-4, Mumbai, Maharashtra" 
              rows={3}
              value={businessAddress}
              onChange={e => setBusinessAddress(e.target.value)}
              className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none text-slate-800 dark:text-white focus:border-indigo-500 transition-colors text-sm resize-none"
              required
            />
          </div>

          {/* Contact Display Preferences */}
          <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-3">
              Bill Contact Information Preference
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-4">
              Do you want to show your contact details on bills and invoices?
            </span>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 text-sm font-semibold select-none">
                <input 
                  type="checkbox" 
                  checked={showPhoneOnBills} 
                  onChange={e => setShowPhoneOnBills(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                Show Phone Number on Bills
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 text-sm font-semibold select-none">
                <input 
                  type="checkbox" 
                  checked={showEmailOnBills} 
                  onChange={e => setShowEmailOnBills(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                Show Email Address on Bills
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 border-none transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Saving Profile...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Save & Continue
                </>
              )}
            </button>
            <button 
              type="button" 
              onClick={onLogout}
              className="py-4 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border-none transition-colors cursor-pointer"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
