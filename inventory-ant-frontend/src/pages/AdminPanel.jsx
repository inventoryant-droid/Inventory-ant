import React, { useState, useEffect } from 'react';
import { Users, Trash2, KeyRound, ShieldAlert } from 'lucide-react';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('http://localhost:3000/users');
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (email) => {
    if (!window.confirm(`Are you sure you want to delete ${email} and all their inventory?`)) return;
    try {
      await fetch(`http://localhost:3000/users/${email}`, { method: 'DELETE' });
      setUsers(users.filter(u => u.email !== email));
    } catch (e) {
      alert('Failed to delete user');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/users/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPass, newPass })
      });
      const data = await res.json();
      if (data.success) {
        alert('Password changed successfully');
        setOldPass('');
        setNewPass('');
      } else {
        alert('Invalid old password');
      }
    } catch (err) {
      alert('Error changing password');
    }
  };

  return (
    <div className="flex-1 p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-8 flex items-center gap-3">
          <ShieldAlert className="text-indigo-600" size={32} />
          Admin Panel
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* User List Section */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-indigo-500" /> Managed Users
              </h2>
              <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">
                {users.length} Total
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">User</th>
                    <th className="p-4 font-semibold">Email</th>
                    <th className="p-4 font-semibold">Joined</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-slate-400">No users found.</td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.email} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {user.picture ? (
                              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="font-semibold text-sm text-slate-800">{user.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">{user.email}</td>
                        <td className="p-4 text-xs text-slate-400">
                          {new Date(user.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleDeleteUser(user.email)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                            title="Delete User"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
             <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <KeyRound className="text-emerald-500" /> Change Master Password
              </h2>
             </div>
             <form onSubmit={handleChangePassword} className="p-6 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Current Password</label>
                  <input 
                    type="password" 
                    value={oldPass}
                    onChange={e => setOldPass(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">New Password</label>
                  <input 
                    type="password" 
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm outline-none transition-all"
                  />
                </div>
                <button type="submit" className="mt-2 w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors border-none cursor-pointer text-sm shadow-sm">
                  Update Password
                </button>
             </form>
          </div>

        </div>
      </div>
    </div>
  );
}
