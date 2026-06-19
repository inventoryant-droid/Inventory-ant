import React, { useState, useEffect } from 'react';
import { Users, Trash2, KeyRound, ShieldAlert, Search, UserCheck, UserX, BarChart3, Package, X, Mail, Phone, Calendar, Info, Clock, AlertTriangle } from 'lucide-react';

export default function AdminPanel({ token, onLogout }) {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalProducts: 0
  });

  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchUsers = async () => {
    try {
      const url = searchQuery
        ? `http://localhost:3000/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`
        : 'http://localhost:3000/api/admin/users';
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (e) {
      console.error("Failed to fetch users:", e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && !data.statusCode) {
        setStats(data);
      }
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchStats();
    }
  }, [searchQuery, token]);

  const handleSoftDelete = async (email) => {
    if (!window.confirm(`Are you sure you want to deactivate ${email}? This user will no longer be able to sign in.`)) return;
    try {
      const res = await fetch(`http://localhost:3000/api/admin/users/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'User deactivated successfully', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
        fetchUsers();
        fetchStats();
        if (selectedUser && selectedUser.email === email) {
          setSelectedUser(prev => prev ? { ...prev, active: false } : null);
        }
      } else {
        alert(data.message || 'Failed to deactivate user');
      }
    } catch (e) {
      alert('Failed to deactivate user');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/api/admin/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPass, newPass })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'Master password changed successfully', type: 'success' });
        setOldPass('');
        setNewPass('');
      } else {
        setMessage({ text: data.message || 'Invalid current password', type: 'error' });
      }
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } catch (err) {
      setMessage({ text: 'Error changing password', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
              <ShieldAlert className="text-indigo-600" size={32} />
              Superuser console
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Manage system access credentials, user parameters, and analytics.
            </p>
          </div>
          
          {message.text && (
            <div className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold shadow-sm transition-all duration-300 animate-fadeIn ${
              message.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                : 'bg-red-50 border-red-100 text-red-700'
            }`}>
              <Info size={14} />
              {message.text}
            </div>
          )}
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Users</div>
              <div className="text-2xl font-black text-slate-800 mt-0.5">{stats.totalUsers}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <UserCheck size={24} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Users</div>
              <div className="text-2xl font-black text-slate-800 mt-0.5">{stats.activeUsers}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
              <UserX size={24} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Inactive Users</div>
              <div className="text-2xl font-black text-slate-800 mt-0.5">{stats.inactiveUsers}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
              <Package size={24} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Products</div>
              <div className="text-2xl font-black text-slate-800 mt-0.5">{stats.totalProducts}</div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Managed Users Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="text-indigo-500" size={20} />
                  Managed Accounts
                </h2>
                <p className="text-xs text-slate-400 font-medium">Verify login records and active scopes.</p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs outline-none transition-all placeholder-slate-400 text-slate-700 font-medium"
                />
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-4 pl-6">Profile</th>
                    <th className="p-4">Authorization</th>
                    <th className="p-4">Scope</th>
                    <th className="p-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-12 text-center text-slate-400 font-medium text-sm">
                        No registered users found matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            {user.picture ? (
                              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-slate-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                {user.name.charAt(0)}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-slate-800">{user.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-medium">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                            user.active
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                              : 'bg-slate-100 border-slate-200 text-slate-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            {user.active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-mono font-bold uppercase text-slate-500">
                          {user.role === 'admin' ? (
                            <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">ROLE_ADMIN</span>
                          ) : (
                            <span className="text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">ROLE_USER</span>
                          )}
                        </td>
                        <td className="p-4 text-right pr-6 flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedUser(user)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                            title="Inspect Details"
                          >
                            <Info size={16} />
                          </button>
                          {user.role !== 'admin' && user.active && (
                            <button 
                              onClick={() => handleSoftDelete(user.email)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                              title="Deactivate Account"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Change Password / Admin Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
               <div className="p-6 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <KeyRound className="text-amber-500" size={18} /> 
                  Update Console Password
                </h2>
                <p className="text-xs text-slate-400 font-medium">Change master security credentials.</p>
               </div>
               <form onSubmit={handleChangePassword} className="p-6 flex flex-col gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Current Credentials</label>
                    <input 
                      type="password" 
                      value={oldPass}
                      onChange={e => setOldPass(e.target.value)}
                      placeholder="Enter current password"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs outline-none transition-all placeholder-slate-400 text-slate-700 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Security Key</label>
                    <input 
                      type="password" 
                      value={newPass}
                      onChange={e => setNewPass(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs outline-none transition-all placeholder-slate-400 text-slate-700 font-medium"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="mt-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all border-none cursor-pointer text-xs uppercase tracking-wider shadow-sm shadow-indigo-600/10"
                  >
                    Submit Modification
                  </button>
               </form>
            </div>
            
            <div className="bg-[#0f172a] rounded-2xl p-6 border border-[#1e293b] text-left text-slate-400 space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <AlertTriangle className="text-amber-500 animate-pulse" size={16} />
                CONSOLE SECURITY RULES
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">
                Any modifications made to accounts, scopes, or system passwords will write access log entry. Use soft deactivations rather than hard deletions to retain user audits.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* User Inspection Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn">
            
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <Info className="text-indigo-600" size={18} />
                Account Detailed Parameters
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full border-none bg-transparent cursor-pointer transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              
              {/* Profile Card Summary */}
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white text-lg font-black flex items-center justify-center uppercase shadow-md shadow-indigo-600/20">
                  {selectedUser.name.substring(0, 2)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-extrabold text-sm text-slate-800 m-0 overflow-hidden text-ellipsis whitespace-nowrap">{selectedUser.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${
                      selectedUser.active
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}>
                      {selectedUser.active ? 'Active Node' : 'Deactivated'}
                    </span>
                    <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                      {selectedUser.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Parameters List */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="text-slate-400 mt-0.5 shrink-0" size={16} />
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Email Address</div>
                    <div className="text-xs text-slate-700 font-semibold font-mono mt-0.5">{selectedUser.email}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="text-slate-400 mt-0.5 shrink-0" size={16} />
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Phone Index</div>
                    <div className="text-xs text-slate-700 font-semibold font-mono mt-0.5">{selectedUser.phone || 'Not Assigned'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="text-slate-400 mt-0.5 shrink-0" size={16} />
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Date Registered</div>
                    <div className="text-xs text-slate-700 font-semibold mt-0.5 flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-400" />
                      {new Date(selectedUser.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="text-slate-400 mt-0.5 shrink-0" size={16} />
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Last Profile Update</div>
                    <div className="text-xs text-slate-700 font-semibold mt-0.5 flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-400" />
                      {new Date(selectedUser.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              {selectedUser.role !== 'admin' && selectedUser.active && (
                <button
                  onClick={() => handleSoftDelete(selectedUser.email)}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-red-500/10"
                >
                  <UserX size={14} />
                  Deactivate Account
                </button>
              )}
              <button
                onClick={() => setSelectedUser(null)}
                className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Close Parameters
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
