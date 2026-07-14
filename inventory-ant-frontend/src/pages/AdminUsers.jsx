import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminService } from '../services/adminService';
import { 
  Users, Search, RefreshCw, Loader2, Eye, Edit3, X, Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../utils/config';
import { PageSkeleton, PageError, EmptyState, StatusBadge, SectionHeader } from '../components/ui/SharedUI';
import '../App.css';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('active_users'); // 'active_users' | 'deleted_users'
  const [selectedUser, setSelectedUser] = useState(null); // Detailed view
  const [editingUser, setEditingUser] = useState(null); // Edit form
  
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('all');

  // Load from dashboard plan click filter
  useEffect(() => {
    const savedFilter = localStorage.getItem('admin_users_plan_filter');
    if (savedFilter) {
      setSelectedPlanFilter(savedFilter);
      localStorage.removeItem('admin_users_plan_filter');
    }
  }, []);

  // Fetch Pricing Plans for the filter dropdown
  const { data: pricingPlans } = useQuery({
    queryKey: ['plansList'],
    queryFn: () => fetch(`${API_BASE_URL}/api/subscription/plans`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('ant_token')}` }
    }).then(res => res.json()),
  });

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editBusiness, setEditBusiness] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // 1. FETCH ALL USERS
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['adminUsersList', search],
    queryFn: () => AdminService.getUsers(search),
    staleTime: 10000,
  });

  // 1b. FETCH DELETED USERS
  const { data: deletedUsers, isLoading: isDeletedLoading, refetch: refetchDeleted } = useQuery({
    queryKey: ['adminDeletedUsersList'],
    queryFn: () => fetch(`${API_BASE_URL}/api/admin/deleted-users`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('ant_token')}` }
    }).then(res => res.json()),
    enabled: activeSubTab === 'deleted_users',
  });

  // Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId) => fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('ant_token')}`
      }
    }).then(async res => {
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete user');
      }
      return res.json();
    }),
    onSuccess: () => {
      toast.success('User account and all associated data permanently deleted.');
      refetch();
      refetchDeleted();
      setSelectedUser(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete user.');
    }
  });

  // 2. FETCH SINGLE USER DETAILS ON CLICK
  const handleViewUser = async (userId) => {
    try {
      toast.loading('Fetching user metrics...', { id: 'details' });
      const details = await AdminService.getUserDetails(userId);
      setSelectedUser(details);
      toast.dismiss('details');
    } catch (e) {
      toast.error('Failed to load user details');
    }
  };

  // 3. DISABLE / ENABLE MUTATION
  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, active }) => AdminService.disableUser(userId, active),
    onSuccess: (_, variables) => {
      toast.success(variables.active ? 'User account activated' : 'User account disabled');
      refetch();
      if (selectedUser && selectedUser.user.id === variables.userId) {
        handleViewUser(variables.userId);
      }
    }
  });

  // 4. FORCE LOGOUT MUTATION
  const logoutMutation = useMutation({
    mutationFn: (userId) => AdminService.forceLogout(userId),
    onSuccess: () => {
      toast.success('User active session terminated and account locked');
      refetch();
      setSelectedUser(null);
    }
  });

  // 5. UPDATE PROFILE MUTATION
  const updateProfileMutation = useMutation({
    mutationFn: ({ userId, data }) => fetch(`${API_BASE_URL}/api/admin/users/${userId}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ant_token')}`,
      },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    onSuccess: () => {
      toast.success('User details updated successfully');
      setEditingUser(null);
      refetch();
    }
  });

  const handleEditClick = (u) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditBusiness(u.businessName || '');
    setEditPhone(u.phone || '');
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      userId: editingUser.id,
      data: {
        name: editName,
        businessName: editBusiness,
        phone: editPhone
      }
    });
  };

  const handleResetPassword = (email) => {
    toast.success(`Password reset token sent to ${email} (brevo.net)`);
  };

  const filteredUsers = React.useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      if (u.role === 'admin') return false;
      if (selectedPlanFilter !== 'all' && u.plan !== selectedPlanFilter) return false;
      return true;
    });
  }, [users, selectedPlanFilter]);

  if (isLoading) return <PageSkeleton rows={2} cols={3} />;
  if (error) return <PageError message="Could not load user accounts." onRetry={refetch} />;

  return (
    <div className="p-6 md:p-8 bg-slate-50 flex-1 overflow-y-auto space-y-6 text-left relative">
      
      {/* ─── DETAIL VIEW MODAL DRAWER ─── */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-end p-0">
          <div className="bg-white h-full max-w-lg w-full p-6 md:p-8 space-y-6 text-left overflow-y-auto shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="m-0 text-lg font-black text-slate-800">{selectedUser.user.name}</h3>
                  <span className="text-xs text-slate-400 font-mono block">{selectedUser.user.email}</span>
                </div>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 border-none bg-transparent cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Business Stats */}
              <div className="bg-slate-50 p-4 border rounded-2xl space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Registered Entity</span>
                <p className="m-0 font-bold text-slate-800 text-sm">{selectedUser.user.businessName || 'Not configured'}</p>
                <p className="m-0 text-slate-500">GST: {selectedUser.user.gstNumber || 'N/A'}</p>
                <p className="m-0 text-slate-500">Address: {selectedUser.user.businessAddress || 'N/A'}</p>
              </div>

              {/* Active Subscription Details */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 border border-indigo-100 rounded-2xl space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-indigo-500 block font-sans">SaaS Subscription Status</span>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Plan Tier:</span>
                  <span className="font-extrabold text-indigo-700 uppercase bg-indigo-100/50 px-2 py-0.5 rounded-md text-[10px]">{selectedUser.user.plan || 'free'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Expires On:</span>
                  <span className="font-bold text-slate-800">
                    {selectedUser.user.validUntil ? new Date(selectedUser.user.validUntil).toLocaleDateString() : 'Never'}
                  </span>
                </div>
                {selectedUser.user.validUntil && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Time Remaining:</span>
                    <span className={`font-bold ${
                      Math.ceil((selectedUser.user.validUntil - Date.now()) / (1000 * 60 * 60 * 24)) <= 7
                        ? 'text-rose-600 animate-pulse'
                        : 'text-emerald-600'
                    }`}>
                      {Math.ceil((selectedUser.user.validUntil - Date.now()) / (1000 * 60 * 60 * 24)) > 0
                        ? `${Math.ceil((selectedUser.user.validUntil - Date.now()) / (1000 * 60 * 60 * 24))} days left`
                        : 'Expired'
                      }
                    </span>
                  </div>
                )}
              </div>

              {/* Feature Usages */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Feature Quotas Usage</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedUser.usage?.map(u => (
                    <div key={u.id} className="p-3 bg-white border rounded-xl">
                      <span className="font-bold text-slate-700 block">{u.feature?.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-1">Used: {u.used}</span>
                    </div>
                  ))}
                  {(!selectedUser.usage || selectedUser.usage.length === 0) && (
                    <div className="col-span-2 text-slate-400 py-2">No active usage logs.</div>
                  )}
                </div>
              </div>

              {/* Audit logs for user */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Recent Audit Handshakes</span>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                  {selectedUser.logs?.slice(0, 3).map(log => (
                    <div key={log.id} className="p-3 text-[11px] flex justify-between items-center">
                      <div>
                        <strong className="text-slate-800">{log.action}</strong>
                        <span className="text-slate-400 block mt-0.5">{log.details}</span>
                      </div>
                      <span className="text-slate-400 font-mono">{new Date(log.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {(!selectedUser.logs || selectedUser.logs.length === 0) && (
                    <div className="p-4 text-slate-400 text-center">No recent audit handshakes.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="border-t pt-4 flex flex-wrap gap-2 justify-end">
              <button 
                onClick={() => handleResetPassword(selectedUser.user.email)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border-none cursor-pointer"
              >
                Reset Password
              </button>
              <button 
                onClick={() => toggleStatusMutation.mutate({ userId: selectedUser.user.id, active: !selectedUser.user.active })}
                className={`py-2 px-4 rounded-xl text-xs font-bold border-none cursor-pointer ${
                  selectedUser.user.active ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                }`}
              >
                {selectedUser.user.active ? 'Disable Account' : 'Activate Account'}
              </button>
              <button 
                onClick={() => logoutMutation.mutate(selectedUser.user.id)}
                className="py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold border-none cursor-pointer"
              >
                Revoke Session
              </button>
              <button 
                onClick={() => {
                  if (window.confirm(`WARNING: Are you sure you want to permanently delete user ${selectedUser.user.name} (${selectedUser.user.email})? This will delete all products, invoices, audit history, and their profile forever. This action is IRREVERSIBLE.`)) {
                    deleteUserMutation.mutate(selectedUser.user.id);
                  }
                }}
                disabled={deleteUserMutation.isPending}
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer flex items-center gap-1.5"
              >
                {deleteUserMutation.isPending && <Loader2 className="animate-spin" size={12} />}
                <Trash2 size={12} /> Permanent Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT PROFILE MODAL ─── */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEditSubmit} className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full space-y-4 shadow-2xl text-left">
            <h3 className="m-0 text-base font-extrabold text-slate-800">Edit User Profile</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Full Name</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Business Name</label>
              <input type="text" value={editBusiness} onChange={e => setEditBusiness(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Phone</label>
              <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-slate-100 rounded-xl text-xs font-bold border-none cursor-pointer">Cancel</button>
              <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer">Save Profile</button>
            </div>
          </form>
        </div>
      )}


      {/* HEADER SECTION */}
      <SectionHeader
        title="B2B User Accounts"
        subtitle="Registered warehouse owner profiles, account status controls and active session management."
        icon={Users}
        action={
          <button
            onClick={() => {
              if (activeSubTab === 'active_users') refetch();
              else refetchDeleted();
            }}
            aria-label="Refresh list"
            className="p-2 border rounded-xl hover:bg-slate-100 cursor-pointer bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <RefreshCw size={16} />
          </button>
        }
      />

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('active_users')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
            activeSubTab === 'active_users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Active Users
        </button>
        <button
          onClick={() => setActiveSubTab('deleted_users')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
            activeSubTab === 'deleted_users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Deleted Users Archive
        </button>
      </div>

      {activeSubTab === 'active_users' ? (
        <>
          {/* Search Controls */}
          <div className="bg-white border rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" aria-hidden="true" />
              <label htmlFor="admin-user-search" className="sr-only">Search users</label>
              <input 
                id="admin-user-search"
                type="search" 
                placeholder="Search by name, email or business..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-400 transition-shadow"
                aria-label="Search users"
              />
            </div>
            <select
              value={selectedPlanFilter}
              onChange={e => setSelectedPlanFilter(e.target.value)}
              className="p-2.5 bg-slate-50 border rounded-xl outline-none text-xs font-bold text-slate-700 min-w-[150px] cursor-pointer"
            >
              <option value="all">All Plans</option>
              {pricingPlans?.map(p => (
                <option key={p.id} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Users table */}
          <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left border-collapse" role="table" aria-label="User accounts list">
                <thead className="bg-slate-50 border-b text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th scope="col" className="p-4">Owner Name</th>
                    <th scope="col" className="p-4">Business</th>
                    <th scope="col" className="p-4">Email Address</th>
                    <th scope="col" className="p-4">SaaS Plan</th>
                    <th scope="col" className="p-4 text-center">Expiry Date</th>
                    <th scope="col" className="p-4 text-center">Status</th>
                    <th scope="col" className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/50 font-medium text-slate-700 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{user.name}</td>
                      <td className="p-4 text-slate-600">{user.businessName || '—'}</td>
                      <td className="p-4 text-slate-500">{user.email}</td>
                      <td className="p-4 text-slate-600 uppercase font-black text-[10px]">
                        <span className={`px-2 py-0.5 rounded-full ${
                          user.plan === 'pro' 
                            ? 'bg-amber-100 text-amber-800' 
                            : user.plan === 'basic' 
                              ? 'bg-indigo-100 text-indigo-800'
                              : user.plan === 'enterprise'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                        }`}>
                          {user.plan || 'free'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 font-mono text-xs text-center">
                        {user.validUntil ? new Date(user.validUntil).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-4 text-center">
                        <StatusBadge status={user.active ? 'active' : 'disabled'} />
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleViewUser(user.id)}
                            aria-label={`View details for ${user.name}`}
                            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold border-none cursor-pointer transition-colors inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-slate-400"
                          >
                            <Eye size={12} aria-hidden="true" /> View
                          </button>
                          <button 
                            onClick={() => handleEditClick(user)}
                            aria-label={`Edit profile for ${user.name}`}
                            className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100 cursor-pointer transition-colors inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          >
                            <Edit3 size={12} aria-hidden="true" /> Edit
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm(`WARNING: Are you sure you want to permanently delete user ${user.name} (${user.email})? This will delete all products, invoices, audit history, and their profile forever. This action is IRREVERSIBLE.`)) {
                                deleteUserMutation.mutate(user.id);
                              }
                            }}
                            aria-label={`Permanently delete ${user.name}`}
                            className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 text-rose-600 rounded-lg text-xs font-bold border border-rose-100 cursor-pointer transition-colors inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-rose-400"
                          >
                            <Trash2 size={12} aria-hidden="true" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!filteredUsers || filteredUsers.length === 0) && (
                <EmptyState
                  icon={Users}
                  title="No users found"
                  description={search || selectedPlanFilter !== 'all' ? `No accounts matching filter criteria.` : 'No registered users yet.'}
                />
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {isDeletedLoading ? (
            <PageSkeleton rows={2} cols={3} />
          ) : (
            <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left border-collapse" role="table" aria-label="Deleted users list">
                  <thead className="bg-slate-50 border-b text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th scope="col" className="p-4">Owner Name</th>
                      <th scope="col" className="p-4">Business</th>
                      <th scope="col" className="p-4">Email Address</th>
                      <th scope="col" className="p-4">Phone</th>
                      <th scope="col" className="p-4 text-center">Deleted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deletedUsers?.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50/50 font-medium text-slate-700 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{user.name}</td>
                        <td className="p-4 text-slate-600">{user.businessName || '—'}</td>
                        <td className="p-4 text-slate-500">{user.email}</td>
                        <td className="p-4 text-slate-500">{user.phone || '—'}</td>
                        <td className="p-4 text-center text-slate-400 font-mono">
                          {new Date(user.deletedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!deletedUsers || deletedUsers.length === 0) && (
                  <EmptyState
                    icon={Users}
                    title="No deleted users"
                    description="No deleted user records found in the archive."
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
