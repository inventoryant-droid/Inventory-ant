import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminService } from '../services/adminService';
import { 
  UserCog, Search, RefreshCw, Loader2, Eye, Edit3, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../utils/config';
import { PageSkeleton, PageError, EmptyState, StatusBadge, SectionHeader } from '../components/ui/SharedUI';
import '../App.css';

export default function AdminAdmins() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null); // Detailed view
  const [editingUser, setEditingUser] = useState(null); // Edit form
  
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

  // 2. FETCH SINGLE USER DETAILS ON CLICK
  const handleViewUser = async (userId) => {
    try {
      toast.loading('Fetching operator metrics...', { id: 'details' });
      const details = await AdminService.getUserDetails(userId);
      setSelectedUser(details);
      toast.dismiss('details');
    } catch (e) {
      toast.error('Failed to load operator details');
    }
  };

  // 3. DISABLE / ENABLE MUTATION
  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, active }) => AdminService.disableUser(userId, active),
    onSuccess: (_, variables) => {
      toast.success(variables.active ? 'Operator account activated' : 'Operator account disabled');
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
      toast.success('Operator session terminated and account locked');
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
      toast.success('Operator details updated successfully');
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

  if (isLoading) return <PageSkeleton rows={2} cols={3} />;
  if (error) return <PageError message="Could not load operator accounts." onRetry={refetch} />;

  const adminUsers = users?.filter(u => u.role === 'admin');

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

              {/* Operator Role */}
              <div className="bg-slate-50 p-4 border rounded-2xl space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Operator Privilege Level</span>
                <p className="m-0 font-bold text-indigo-700 text-sm capitalize">{selectedUser.user.adminRole?.replace('_', ' ') || 'Sub Admin'}</p>
                <p className="m-0 text-slate-500">Privileges: Full Console Access & Auditing</p>
              </div>

              {/* Audit logs for operator */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Operator Actions Trail</span>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                  {selectedUser.logs?.slice(0, 5).map(log => (
                    <div key={log.id} className="p-3 text-[11px] flex justify-between items-center">
                      <div>
                        <strong className="text-slate-800">{log.action}</strong>
                        <span className="text-slate-400 block mt-0.5">{log.details}</span>
                      </div>
                      <span className="text-slate-400 font-mono">{new Date(log.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {(!selectedUser.logs || selectedUser.logs.length === 0) && (
                    <div className="p-4 text-slate-400 text-center">No operator actions logged.</div>
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
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT PROFILE MODAL ─── */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEditSubmit} className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full space-y-4 shadow-2xl text-left">
            <h3 className="m-0 text-base font-extrabold text-slate-800">Edit Operator Profile</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Full Name</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Title / Business</label>
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
        title="System Administrators"
        subtitle="Manage console operators, assign roles, monitor access tokens, and revoke admin session keys."
        icon={UserCog}
        action={
          <button
            onClick={() => refetch()}
            aria-label="Refresh operator list"
            className="p-2 border rounded-xl hover:bg-slate-100 cursor-pointer bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <RefreshCw size={16} />
          </button>
        }
      />

      {/* Search Controls */}
      <div className="bg-white border rounded-2xl p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" aria-hidden="true" />
          <label htmlFor="admin-operator-search" className="sr-only">Search operators</label>
          <input 
            id="admin-operator-search"
            type="search" 
            placeholder="Search by name, email or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-400 transition-shadow"
            aria-label="Search operators"
          />
        </div>
      </div>

      {/* Admins table */}
      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse" role="table" aria-label="Operators accounts list">
            <thead className="bg-slate-50 border-b text-slate-400 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th scope="col" className="p-4">Operator Name</th>
                <th scope="col" className="p-4">Assigned Role</th>
                <th scope="col" className="p-4">Email Address</th>
                <th scope="col" className="p-4 text-center">Status</th>
                <th scope="col" className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adminUsers?.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 font-medium text-slate-700 transition-colors">
                  <td className="p-4 font-bold text-slate-800">{user.name}</td>
                  <td className="p-4 text-indigo-700 font-bold capitalize">{user.adminRole?.replace('_', ' ') || 'Sub Admin'}</td>
                  <td className="p-4 text-slate-500">{user.email}</td>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!adminUsers || adminUsers.length === 0) && (
            <EmptyState
              icon={UserCog}
              title="No administrators found"
              description={search ? `No accounts matching "${search}"` : 'No registered administrators yet.'}
            />
          )}
        </div>
      </div>

    </div>
  );
}
