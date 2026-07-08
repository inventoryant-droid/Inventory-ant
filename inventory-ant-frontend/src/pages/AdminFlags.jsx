import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminService } from '../services/adminService';
import { 
  UserCheck, ToggleLeft, ToggleRight, Plus, Trash2, Edit3, 
  Search, RefreshCw, Loader2, Save, Info, Globe, Percent
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../utils/config';
import '../App.css';

export default function AdminFlags() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [percentage, setPercentage] = useState(100);
  const [environment, setEnvironment] = useState('production');

  // 1. FETCH FLAGS
  const { data: flags, isLoading, error, refetch } = useQuery({
    queryKey: ['adminFlagsList'],
    queryFn: () => fetch(`${API_BASE_URL}/api/admin/feature-flags`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('ant_token')}` }
    }).then(res => res.json()),
  });

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('ant_token')}`
  });

  // 2. CREATE MUTATION
  const createMutation = useMutation({
    mutationFn: (newFlag) => fetch(`${API_BASE_URL}/api/admin/feature-flags`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(newFlag)
    }).then(res => {
      if (!res.ok) return res.json().then(e => { throw new Error(e.message || 'Create failed'); });
      return res.json();
    }),
    onSuccess: () => {
      toast.success('Feature flag registered');
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['adminFlagsList'] });
    },
    onError: (err) => toast.error(err.message)
  });

  // 3. UPDATE MUTATION
  const updateMutation = useMutation({
    mutationFn: ({ id, fields }) => fetch(`${API_BASE_URL}/api/admin/feature-flags/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(fields)
    }).then(res => {
      if (!res.ok) return res.json().then(e => { throw new Error(e.message || 'Update failed'); });
      return res.json();
    }),
    onSuccess: () => {
      toast.success('Feature flag updated');
      setEditingFlag(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['adminFlagsList'] });
    },
    onError: (err) => toast.error(err.message)
  });

  // 4. DELETE MUTATION
  const deleteMutation = useMutation({
    mutationFn: (id) => fetch(`${API_BASE_URL}/api/admin/feature-flags/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(res => {
      if (!res.ok) return res.json().then(e => { throw new Error(e.message || 'Delete failed'); });
      return res.json();
    }),
    onSuccess: () => {
      toast.success('Feature flag deleted');
      queryClient.invalidateQueries({ queryKey: ['adminFlagsList'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const resetForm = () => {
    setName('');
    setCode('');
    setEnabled(false);
    setPercentage(100);
    setEnvironment('production');
  };

  const handleEditClick = (flag) => {
    setEditingFlag(flag);
    setName(flag.name);
    setCode(flag.code);
    setEnabled(flag.enabled);
    
    // Parse json conditions
    let pct = 100;
    let env = 'production';
    if (flag.conditions) {
      try {
        const condObj = typeof flag.conditions === 'string' ? JSON.parse(flag.conditions) : flag.conditions;
        if (condObj.percentage !== undefined) pct = condObj.percentage;
        if (condObj.env !== undefined) env = condObj.env;
      } catch (e) {}
    }
    setPercentage(pct);
    setEnvironment(env);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      code: code.toUpperCase().replace(/\s+/g, '_'),
      enabled,
      conditions: {
        percentage: Number(percentage),
        env: environment
      }
    });
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      id: editingFlag.id,
      fields: {
        name,
        code: code.toUpperCase().replace(/\s+/g, '_'),
        enabled,
        conditions: {
          percentage: Number(percentage),
          env: environment
        }
      }
    });
  };

  const filteredFlags = flags?.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.code.toLowerCase().includes(search.toLowerCase())
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
      
      {/* ─── CREATE / EDIT FEATURE FLAG MODAL ─── */}
      {(isCreateOpen || editingFlag) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={isCreateOpen ? handleCreateSubmit : handleUpdateSubmit} 
            className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full space-y-4 shadow-2xl text-left"
          >
            <h3 className="m-0 text-base font-extrabold text-slate-800">
              {isCreateOpen ? 'Create Feature Flag' : `Update Flag: ${editingFlag?.name}`}
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Flag Label Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">System Code (e.g. BETA_SCAN)</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value)} required disabled={!!editingFlag} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none font-mono disabled:opacity-50" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Percentage Rollout</label>
                <input type="number" min="0" max="100" value={percentage} onChange={e => setPercentage(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Env Scope</label>
                <select value={environment} onChange={e => setEnvironment(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-xs">
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 pt-2">
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
              Globally Enabled (Active)
            </label>

            <div className="flex gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => { setIsCreateOpen(false); setEditingFlag(null); resetForm(); }} 
                className="flex-1 py-3 bg-slate-100 rounded-xl text-xs font-bold border-none cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer"
              >
                Save Flag
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="m-0 text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
            <UserCheck className="text-indigo-600" /> Feature Flags Rollouts
          </h2>
          <span className="text-xs text-slate-400 font-bold font-mono">Roll out beta configurations to a percentage of users or target specific staging environments.</span>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer flex items-center gap-1.5"
        >
          <Plus size={14} /> Create Flag
        </button>
      </div>

      {/* SEARCH PANEL */}
      <div className="bg-white border rounded-2xl p-4 flex gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search flags..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl outline-none text-sm"
          />
        </div>
      </div>

      {/* FLAGS TABLE LIST */}
      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead className="bg-slate-50 border-b text-slate-400 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-4">Flag Details</th>
                <th className="p-4">Rollout (%)</th>
                <th className="p-4">Environment</th>
                <th className="p-4 text-center">Active Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFlags?.map(flag => {
                let percentage = 100;
                let env = 'production';
                if (flag.conditions) {
                  try {
                    const c = typeof flag.conditions === 'string' ? JSON.parse(flag.conditions) : flag.conditions;
                    if (c.percentage !== undefined) percentage = c.percentage;
                    if (c.env !== undefined) env = c.env;
                  } catch (e) {}
                }
                return (
                  <tr key={flag.id} className="hover:bg-slate-50 font-medium text-slate-700">
                    <td className="p-4">
                      <strong className="text-slate-800 text-sm">{flag.name}</strong>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{flag.code}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      <span className="flex items-center gap-1"><Percent size={12} /> {percentage}%</span>
                    </td>
                    <td className="p-4 capitalize">
                      <span className="flex items-center gap-1"><Globe size={12} /> {env}</span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => updateMutation.mutate({ id: flag.id, fields: { enabled: !flag.enabled } })}
                        className="bg-transparent border-none cursor-pointer"
                      >
                        {flag.enabled ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-slate-300" />}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleEditClick(flag)} 
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 border-none bg-transparent cursor-pointer"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => { if(confirm('Delete feature flag?')) deleteMutation.mutate(flag.id); }}
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
