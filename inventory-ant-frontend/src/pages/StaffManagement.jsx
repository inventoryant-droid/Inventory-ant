import { API_BASE_URL } from '../utils/config';
import React, { useState, useEffect, useRef } from 'react';
import { Users, UserPlus, Shield, ShieldAlert, Phone, Mail, Key, Trash2, ShieldCheck, Check, X, RefreshCw, ToggleLeft, ToggleRight, Loader2, Image } from 'lucide-react';
import '../App.css';

export default function StaffManagement({ token, userProfile, userId }) {
  const fileInputRef = useRef(null);

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [pictureBase64, setPictureBase64] = useState('');

  // Password reset modal states
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Compute generated username live
  const cleanedBiz = (userProfile?.businessName || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const cleanedName = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const generatedLoginId = cleanedName ? `${cleanedName}@${cleanedBiz || 'business'}.ant` : '';

  const fetchStaff = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      } else {
        setError('Failed to fetch staff members.');
      }
    } catch (e) {
      setError('Network error while loading staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [token]);

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setError('Avatar supports only JPG, PNG, or WEBP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPictureBase64(event.target.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Staff Name is required.');
      return;
    }
    if (!password.trim() || password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/user/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          phone,
          password,
          picture: pictureBase64
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create staff.');
      }

      setSuccess(`Staff account "${data.name}" created successfully! Login ID: ${data.email}`);
      setName('');
      setPhone('');
      setPassword('');
      setPictureBase64('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchStaff();
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError(err.message || 'Server error occurred.');
    }
  };

  const handleToggleStatus = async (staff) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/staff/${staff.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ active: !staff.active })
      });
      if (res.ok) {
        setStaffList(staffList.map(s => s.id === staff.id ? { ...s, active: !s.active } : s));
        setSuccess(`Staff status updated for ${staff.name}!`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (e) {
      setError('Failed to update staff status.');
    }
  };

  const handleDeleteStaff = async (staff) => {
    if (!window.confirm(`DANGER: Are you sure you want to permanently delete staff member "${staff.name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/staff/${staff.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStaffList(staffList.filter(s => s.id !== staff.id));
        setSuccess(`Staff member "${staff.name}" removed successfully.`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (e) {
      setError('Failed to delete staff member.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!newPassword.trim() || newPassword.length < 4) {
      setPassError('Password must be at least 4 characters long.');
      return;
    }

    setPassLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/staff/${selectedStaff.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPass: newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset password.');
      }

      setPassSuccess(`Password reset successfully for ${selectedStaff.name}!`);
      setNewPassword('');
      setTimeout(() => {
        setPassSuccess('');
        setSelectedStaff(null);
      }, 2500);
    } catch (err) {
      setPassError(err.message || 'Failed to reset password.');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC]">
      <div className="flex flex-col mb-8 text-left">
        <h1 className="m-0 text-3xl font-extrabold tracking-tight text-indigo-600 flex items-center gap-3">
          <Users size={32} /> Staff Management
        </h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">Create, configure, and monitor roles and access permissions for your warehouse loaders and billing staff.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Creation Panel */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.01)] text-left flex flex-col self-start">
          <h3 className="m-0 mb-4 text-[15px] font-bold text-slate-800 flex items-center gap-2">
            <UserPlus size={18} className="text-indigo-500" /> Add Staff Member
          </h3>
          <p className="text-slate-500 text-xs leading-relaxed mb-6">
            Staff members will get custom credentials linked to your business. They will only have access to Billing, Catalog Inventory, AI Terminal, and Smart Scanner.
          </p>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold p-4 rounded-xl flex items-center gap-2 mb-6">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold p-4 rounded-xl flex items-center gap-2 mb-6">
              <ShieldCheck size={16} />
              <span className="break-all">{success}</span>
            </div>
          )}

          <form onSubmit={handleCreateStaff} className="flex flex-col gap-4">
            
            {/* Base64 Photo selection */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                {pictureBase64 ? (
                  <img src={pictureBase64} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Image size={20} className="text-slate-400" />
                )}
              </div>
              <div className="flex-1 flex flex-col gap-1 text-left">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Staff Avatar (Optional)</span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".jpg,.jpeg,.png,.webp" 
                  onChange={handleAvatarUpload} 
                  className="hidden" 
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current.click()} 
                  className="py-1 px-3.5 bg-white hover:bg-slate-50 text-indigo-600 border border-slate-200 rounded-md text-[10px] font-bold transition-colors cursor-pointer shadow-sm self-start mt-1"
                >
                  Upload File
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Staff Full Name</label>
              <input 
                type="text" 
                placeholder="e.g. Rajesh Kumar"
                value={name}
                onChange={e => setName(e.target.value)}
                className="p-3 border border-slate-200 rounded-xl outline-none text-slate-800 focus:border-indigo-500 transition-colors text-xs"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone Number (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="p-3 border border-slate-200 rounded-xl outline-none text-slate-800 focus:border-indigo-500 transition-colors text-xs"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Set Login Password</label>
              <input 
                type="text" 
                placeholder="Set password for staff"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="p-3 border border-slate-200 rounded-xl outline-none text-slate-800 focus:border-indigo-500 transition-colors text-xs"
                required
              />
            </div>

            {/* Generated Login ID preview */}
            {generatedLoginId && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-left">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">Generated Login ID</span>
                <span className="text-xs font-mono font-bold text-indigo-700 break-all">{generatedLoginId}</span>
              </div>
            )}

            <button 
              type="submit"
              className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none shadow-sm transition-colors cursor-pointer w-full mt-2"
            >
              CREATE STAFF ACCOUNT
            </button>
          </form>
        </div>

        {/* List Panel */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.01)] overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white text-left">
              <h3 className="m-0 text-[15px] font-bold text-slate-800">Active Staff Registries</h3>
              <span className="bg-indigo-50 text-indigo-600 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                {staffList.length} Accounts
              </span>
            </div>

            <div className="overflow-x-auto text-left">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-12">Staff</th>
                    <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold">Login ID / Username</th>
                    <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-32">Phone</th>
                    <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold w-24">Status</th>
                    <th className="px-6 py-4 text-slate-400 text-[10px] tracking-wider uppercase font-bold text-right pr-6 w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400 text-xs">
                        <Loader2 className="animate-spin inline mr-2 text-indigo-500" size={16} /> Loading registries...
                      </td>
                    </tr>
                  ) : staffList.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-slate-400 text-sm italic">
                        No staff accounts created yet. Use the sidebar panel to add staff.
                      </td>
                    </tr>
                  ) : (
                    staffList.map(staff => (
                      <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                              {staff.picture ? (
                                <img src={staff.picture} alt={staff.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full font-bold text-indigo-500 bg-indigo-50 flex items-center justify-center text-xs">
                                  {staff.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-slate-800 text-xs">{staff.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-600 select-all">
                          {staff.email}
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-semibold text-xs">
                          {staff.phone || '---'}
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => handleToggleStatus(staff)} 
                            className="bg-transparent border-none p-0 cursor-pointer text-xs font-semibold flex items-center gap-1.5 focus:outline-none"
                            title={staff.active ? "Click to Deactivate" : "Click to Activate"}
                          >
                            {staff.active ? (
                              <span className="flex items-center text-emerald-600 gap-1 font-bold">
                                <ToggleRight size={22} className="text-emerald-500" /> Active
                              </span>
                            ) : (
                              <span className="flex items-center text-rose-500 gap-1 font-bold">
                                <ToggleLeft size={22} className="text-slate-300" /> Inactive
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right pr-6 flex items-center justify-end gap-2.5 h-[64px]">
                          <button 
                            onClick={() => setSelectedStaff(staff)}
                            className="py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 border-none rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 inline-flex"
                            title="Reset Staff Password"
                          >
                            <Key size={12} /> Password
                          </button>
                          <button 
                            onClick={() => handleDeleteStaff(staff)}
                            className="py-1 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border-none rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 inline-flex"
                            title="Remove Staff"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 border border-slate-200 text-left shadow-2xl flex flex-col gap-5 relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="m-0 text-base font-bold text-slate-800 flex items-center gap-2">
              <Key size={18} className="text-indigo-500" /> Reset Password
            </h3>
            <p className="text-slate-500 text-xs m-0">
              Updating login password for staff: <strong className="text-slate-800">{selectedStaff.name}</strong> ({selectedStaff.email})
            </p>

            {passError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold p-4 rounded-xl flex items-center gap-2">
                <ShieldAlert size={14} />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold p-4 rounded-xl flex items-center gap-2">
                <Check size={14} />
                <span>{passSuccess}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Set New Password</label>
                <input 
                  type="text" 
                  placeholder="At least 4 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="p-3 border border-slate-200 rounded-xl outline-none text-slate-800 focus:border-indigo-500 transition-colors text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                <button 
                  type="button" 
                  onClick={() => setSelectedStaff(null)} 
                  className="py-2 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={passLoading}
                  className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5"
                >
                  {passLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Confirm Update
                </button>
              </div>
            </form>

            <button 
              onClick={() => setSelectedStaff(null)} 
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
