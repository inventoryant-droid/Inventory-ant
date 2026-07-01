import { API_BASE_URL } from '../utils/config';
import React, { useState, useEffect, useRef } from 'react';
import { Building, Mail, Phone, MapPin, Check, ShieldCheck, Loader2, Sparkles, Key, User, Calendar, ShieldAlert } from 'lucide-react';
import PasswordInput from '../components/ui/PasswordInput';
import '../App.css';

export default function Profile({ token, userProfile, onProfileUpdate, theme, userRole }) {
  const logoInputRef = useRef(null);

  if (userRole === 'staff') {
    return (
      <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC]">
        <div className="flex flex-col mb-8 text-left">
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-[#ef4444]">Access Restricted</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Staff members are not authorized to view the profile.</p>
        </div>
      </div>
    );
  }

  // Profile details states
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [showPhoneOnBills, setShowPhoneOnBills] = useState(true);
  const [showEmailOnBills, setShowEmailOnBills] = useState(true);
  const [logoBase64, setLogoBase64] = useState('');
  const [businessNote, setBusinessNote] = useState('');

  // Password update states
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Banners states
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Initialize fields
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setBusinessName(userProfile.businessName || '');
      setBusinessType(userProfile.businessType || '');
      setEmail(userProfile.email || '');
      setPhone(userProfile.phone || '');
      setGstNumber(userProfile.gstNumber || '');
      setBusinessAddress(userProfile.businessAddress || '');
      setShowPhoneOnBills(userProfile.showPhoneOnBills !== false);
      setShowEmailOnBills(userProfile.showEmailOnBills !== false);
      setLogoBase64(userProfile.businessLogo || '');
      setBusinessNote(userProfile.businessNote || '');
    }
  }, [userProfile]);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setProfileError('Supported formats: JPG, PNG, WEBP only.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoBase64(event.target.result);
      setProfileError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoBase64('');
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim()) {
      setProfileError('Personal Name is required.');
      return;
    }
    if (!businessName.trim()) {
      setProfileError('Business Name is required.');
      return;
    }
    if (!businessType.trim()) {
      setProfileError('Business Type is required.');
      return;
    }
    if (!email.trim()) {
      setProfileError('Email Address is required.');
      return;
    }
    if (!phone.trim()) {
      setProfileError('Phone Number is required.');
      return;
    }
    if (!businessAddress.trim()) {
      setProfileError('Business Address is required.');
      return;
    }

    setProfileLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          businessName,
          businessType,
          businessLogo: logoBase64,
          gstNumber,
          businessAddress,
          showPhoneOnBills,
          showEmailOnBills,
          businessNote,
          profileCompleted: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile.');
      }

      onProfileUpdate(data);
      setProfileSuccess('Business Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      setProfileError(err.message || 'Server error occurred.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPass) {
      setPasswordError('Current Password is required.');
      return;
    }
    if (!newPass) {
      setPasswordError('New Password is required.');
      return;
    }
    if (newPass !== confirmPass) {
      setPasswordError('New passwords do not match.');
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
        body: JSON.stringify({
          oldPass,
          newPass
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update password.');
      }

      setPasswordSuccess('Password changed successfully!');
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      setPasswordError(err.message || 'Server error occurred.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const formattedJoinDate = userProfile?.createdAt 
    ? new Date(userProfile.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '---';

  return (
    <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC]">
      <div className="flex flex-col mb-8">
        <h1 className="m-0 text-3xl font-extrabold tracking-tight text-indigo-600">
          My Profile
        </h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">Manage your personal account credentials, business details, and security parameters.</p>
      </div>

      <div className="flex flex-col gap-6 max-w-4xl">
        {/* Profile Card Header */}
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full border-2 border-slate-200 overflow-hidden bg-slate-50 shrink-0 flex items-center justify-center shadow-inner">
            {logoBase64 ? (
              <img src={logoBase64} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-slate-400" />
            )}
          </div>
          <div className="flex-1 text-center sm:text-left min-w-0">
            <h2 className="m-0 text-2xl font-black text-slate-800 truncate">
              {userProfile?.businessName || userProfile?.name || 'User Account'}
            </h2>
            
            {/* Badges and metadata */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
              <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                {userProfile?.role === 'admin' ? 'ROLE_ADMIN' : 'ROLE_USER'}
              </span>
              <span className={`text-[10px] border px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${userProfile?.active !== false ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                {userProfile?.active !== false ? 'Account Active' : 'Account Suspended'}
              </span>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-300" /> Joined {formattedJoinDate}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form edit details - takes 2 cols on lg screens */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <h3 className="m-0 text-[15px] font-bold text-slate-800 flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-indigo-500" /> Edit Profile Details
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Apne personal and business profile details ko yahan update karein. Ye changes invoices aur system documents me reflect hongi.
              </p>

              {profileError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm font-semibold p-4 rounded-xl flex items-center gap-2 mb-6">
                  <ShieldAlert size={16} />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold p-4 rounded-xl flex items-center gap-2 mb-6">
                  <Check size={16} />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <form onSubmit={handleProfileSave} className="flex flex-col gap-6">
                {/* Photo upload row */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-16 h-16 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                    {logoBase64 ? (
                      <img src={logoBase64} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Building size={24} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-1 items-center sm:items-start text-center sm:text-left">
                    <span className="text-xs font-bold text-slate-700">Business Logo / Profile Photo</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="file" 
                        ref={logoInputRef} 
                        accept=".jpg,.jpeg,.png,.webp" 
                        onChange={handleLogoUpload} 
                        className="hidden" 
                      />
                      <button 
                        type="button" 
                        onClick={() => logoInputRef.current.click()} 
                        className="py-1.5 px-3 bg-white hover:bg-slate-50 text-indigo-600 border border-slate-200 rounded-md text-xs font-bold transition-colors cursor-pointer shadow-sm"
                      >
                        {logoBase64 ? 'Update Logo' : 'Select Photo'}
                      </button>
                      {logoBase64 && (
                        <button 
                          type="button" 
                          onClick={handleRemoveLogo} 
                          className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border-none rounded-md text-xs font-bold transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <User size={12} className="text-slate-400" /> Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="p-3 border border-slate-200 rounded-lg outline-none text-slate-800 focus:border-indigo-500 transition-colors text-sm"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Building size={12} className="text-slate-400" /> Business Name <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      className="p-3 border border-slate-200 rounded-lg outline-none text-slate-800 focus:border-indigo-500 transition-colors text-sm"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-indigo-500" /> Business Type <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Retail, Wholesale, Manufacturing"
                      value={businessType}
                      onChange={e => setBusinessType(e.target.value)}
                      className="p-3 border border-slate-200 rounded-lg outline-none text-slate-800 focus:border-indigo-500 transition-colors text-sm"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Mail size={12} className="text-slate-400" /> Account Email <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="p-3 border border-slate-200 rounded-lg outline-none text-slate-800 focus:border-indigo-500 transition-colors text-sm"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Phone size={12} className="text-slate-400" /> Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="p-3 border border-slate-200 rounded-lg outline-none text-slate-800 focus:border-indigo-500 transition-colors text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-slate-400" /> GST Number (Optional)
                  </label>
                  <input 
                    type="text" 
                    value={gstNumber}
                    onChange={e => setGstNumber(e.target.value)}
                    className="p-3 border border-slate-200 rounded-lg outline-none text-slate-800 focus:border-indigo-500 transition-colors text-sm"
                    placeholder="e.g. 22AAAAA0000A1Z5"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-indigo-500" /> Business Note (Optional)
                  </label>
                  <input 
                    type="text" 
                    value={businessNote}
                    onChange={e => setBusinessNote(e.target.value)}
                    className="p-3 border border-slate-200 rounded-lg outline-none text-slate-800 focus:border-indigo-500 transition-colors text-sm"
                    placeholder="e.g. Wholesaler of Classmate, Link, Studymate, and all kinds of Stationery items"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <MapPin size={12} className="text-slate-400" /> Business Address <span className="text-rose-500">*</span>
                  </label>
                  <textarea 
                    rows={2}
                    value={businessAddress}
                    onChange={e => setBusinessAddress(e.target.value)}
                    className="p-3 border border-slate-200 rounded-lg outline-none text-slate-800 focus:border-indigo-500 transition-colors text-sm resize-none"
                    required
                  />
                </div>

                {/* Preference Visibility */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Invoice Details Visibility Preference
                  </span>
                  <span className="text-[11px] text-slate-400 block mb-3">
                    Choose what contact information is rendered on the tax invoices.
                  </span>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-sm font-semibold select-none">
                      <input 
                        type="checkbox" 
                        checked={showPhoneOnBills} 
                        onChange={e => setShowPhoneOnBills(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      Show Phone Number on Bills
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-sm font-semibold select-none">
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

                <button 
                  type="submit" 
                  disabled={profileLoading}
                  className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-bold border-none shadow-sm transition-colors cursor-pointer w-full md:w-auto flex items-center justify-center gap-2 self-start"
                >
                  {profileLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Save Details
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Change Password - 1 col on lg screens */}
          <div className="flex flex-col gap-6">
            <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <h3 className="m-0 text-[15px] font-bold text-slate-800 flex items-center gap-2 mb-2">
                <Key size={18} className="text-indigo-500" /> Account Security
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Apna login password yahan se change karein.
              </p>

              {passwordError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold p-4 rounded-xl flex items-center gap-2 mb-4">
                  <ShieldAlert size={14} />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold p-4 rounded-xl flex items-center gap-2 mb-4">
                  <Check size={14} />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSave} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Password</label>
                  <PasswordInput
                    value={oldPass}
                    onChange={e => setOldPass(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="p-3 border border-slate-200 rounded-lg outline-none text-slate-800 focus:border-indigo-500 transition-colors text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">New Password</label>
                  <PasswordInput
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    placeholder="Enter new password"
                    required
                    className="p-3 border border-slate-200 rounded-lg outline-none text-slate-800 focus:border-indigo-500 transition-colors text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Confirm Password</label>
                  <PasswordInput
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    className="p-3 border border-slate-200 rounded-lg outline-none text-slate-800 focus:border-indigo-500 transition-colors text-sm"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={passwordLoading}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-600 text-white rounded-lg text-xs font-bold border-none transition-colors cursor-pointer w-full mt-2 flex items-center justify-center gap-2"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
