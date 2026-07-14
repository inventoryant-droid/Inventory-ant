import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Activity, Plus, Trash2, Edit3, Search, RefreshCw, 
  Loader2, ToggleLeft, ToggleRight, Grid, Layers, Check, X, Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../utils/config';
import '../App.css';

export default function AdminFeatures() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState('matrix'); // 'matrix' | 'catalog'
  const [search, setSearch] = useState('');
  const [editingFeature, setEditingFeature] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Core');
  const [isActive, setIsActive] = useState(true);

  // Form mapping matrix states
  const [editingMapping, setEditingMapping] = useState(null); // { planId, featureId, limitValue, unlimited }

  // 1. FETCH FEATURES
  const { data: features, isLoading: featsLoading, refetch: refetchFeats } = useQuery({
    queryKey: ['adminFeaturesList'],
    queryFn: () => fetch(`${API_BASE_URL}/api/admin/features`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('ant_token')}` }
    }).then(res => res.json()),
  });

  // 2. FETCH PLANS
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['adminPlansList'],
    queryFn: () => fetch(`${API_BASE_URL}/api/admin/plans`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('ant_token')}` }
    }).then(res => res.json()),
  });

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('ant_token')}`
  });

  // 3. CREATE FEATURE MUTATION
  const createMutation = useMutation({
    mutationFn: (newFeat) => fetch(`${API_BASE_URL}/api/admin/features`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(newFeat)
    }).then(res => {
      if (!res.ok) return res.json().then(e => { throw new Error(e.message || 'Create failed'); });
      return res.json();
    }),
    onSuccess: () => {
      toast.success('Feature registered successfully');
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['adminFeaturesList'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plansCompare'] });
    },
    onError: (err) => toast.error(err.message)
  });

  // 4. UPDATE FEATURE MUTATION
  const updateMutation = useMutation({
    mutationFn: ({ id, updatedFields }) => fetch(`${API_BASE_URL}/api/admin/features/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updatedFields)
    }).then(res => {
      if (!res.ok) return res.json().then(e => { throw new Error(e.message || 'Update failed'); });
      return res.json();
    }),
    onSuccess: () => {
      toast.success('Feature description updated');
      setEditingFeature(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['adminFeaturesList'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plansCompare'] });
    },
    onError: (err) => toast.error(err.message)
  });

  // 5. DELETE FEATURE MUTATION
  const deleteMutation = useMutation({
    mutationFn: (id) => fetch(`${API_BASE_URL}/api/admin/features/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(res => {
      if (!res.ok) return res.json().then(e => { throw new Error(e.message || 'Delete failed'); });
      return res.json();
    }),
    onSuccess: () => {
      toast.success('Feature removed');
      queryClient.invalidateQueries({ queryKey: ['adminFeaturesList'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plansCompare'] });
    },
    onError: (err) => toast.error(err.message)
  });

  // 6. MAPPING MATRIX MUTATIONS
  const mapFeatureMutation = useMutation({
    mutationFn: (mapping) => fetch(`${API_BASE_URL}/api/admin/mappings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(mapping)
    }).then(res => res.json()),
    onSuccess: () => {
      toast.success('Matrix mapping updated');
      setEditingMapping(null);
      queryClient.invalidateQueries({ queryKey: ['adminPlansList'] });
      queryClient.invalidateQueries({ queryKey: ['adminFeaturesList'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plansCompare'] });
    }
  });

  const removeMappingMutation = useMutation({
    mutationFn: ({ planId, featureId }) => fetch(`${API_BASE_URL}/api/admin/mappings/${planId}/${featureId}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(res => res.json()),
    onSuccess: () => {
      toast.success('Feature disabled for target plan');
      queryClient.invalidateQueries({ queryKey: ['adminPlansList'] });
      queryClient.invalidateQueries({ queryKey: ['adminFeaturesList'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plansCompare'] });
    }
  });

  const resetForm = () => {
    setName('');
    setCode('');
    setDescription('');
    setCategory('Core');
    setIsActive(true);
  };

  const handleEditClick = (feat) => {
    setEditingFeature(feat);
    setName(feat.name);
    setCode(feat.code);
    setDescription(feat.description || '');
    setCategory(feat.category || 'Core');
    setIsActive(feat.isActive !== false);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({ name, code, description, category, isActive });
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      id: editingFeature.id,
      updatedFields: { name, code, description, category, isActive }
    });
  };

  // Check if feature is mapped to plan and return limit value info
  const getMappingInfo = (plan, feature) => {
    if (!plan.features) return null;
    const mapping = plan.features.find(f => f.featureId === feature.id);
    if (!mapping || mapping.enabled === false) return null;
    return mapping;
  };

  const handleToggleCell = (plan, feature) => {
    const existing = getMappingInfo(plan, feature);
    if (existing) {
      removeMappingMutation.mutate({ planId: plan.id, featureId: feature.id });
    } else {
      // Map with defaults
      mapFeatureMutation.mutate({
        planId: plan.id,
        featureId: feature.id,
        enabled: true,
        limitValue: null // Unlimited by default
      });
    }
  };

  const handleEditLimit = (plan, feature, mapping) => {
    setEditingMapping({
      planId: plan.id,
      featureId: feature.id,
      planName: plan.name,
      featureName: feature.name,
      limitValue: mapping.limitValue !== null ? mapping.limitValue : '',
      unlimited: mapping.limitValue === null
    });
  };

  const handleSaveMappingLimit = () => {
    if (!editingMapping) return;
    mapFeatureMutation.mutate({
      planId: editingMapping.planId,
      featureId: editingMapping.featureId,
      enabled: true,
      limitValue: editingMapping.unlimited ? null : Number(editingMapping.limitValue)
    });
  };

  const filteredFeatures = features?.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.code.toLowerCase().includes(search.toLowerCase())
  );

  if (featsLoading || plansLoading) {
    return (
      <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6 animate-pulse bg-slate-50 text-left">
        <div className="h-10 bg-slate-200 rounded-lg w-48" />
        <div className="h-64 bg-white border rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 flex-1 overflow-y-auto space-y-6 text-left relative">
      
      {/* ─── CREATE / EDIT FEATURE MODALS ─── */}
      {(isCreateOpen || editingFeature) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={isCreateOpen ? handleCreateSubmit : handleUpdateSubmit} 
            className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full space-y-4 shadow-2xl text-left"
          >
            <h3 className="m-0 text-base font-extrabold text-slate-800">
              {isCreateOpen ? 'Register SaaS Feature' : `Update Feature: ${editingFeature?.name}`}
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Feature Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">System Code (e.g. AI_CHAT)</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value)} required disabled={!!editingFeature} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none font-mono disabled:opacity-50" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Description</label>
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-xs" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-xs">
                <option value="Core">Core Modules</option>
                <option value="AI">AI Engines</option>
                <option value="Payments">Transaction Payments</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 pt-2">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              Is Active (Available in Matrix)
            </label>

            <div className="flex gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => { setIsCreateOpen(false); setEditingFeature(null); resetForm(); }} 
                className="flex-1 py-3 bg-slate-100 rounded-xl text-xs font-bold border-none cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── EDIT LIMIT VALUE MODAL ─── */}
      {editingMapping && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-left">
            <h3 className="m-0 text-base font-extrabold text-slate-800">
              Limit Value: {editingMapping.featureName}
            </h3>
            <p className="text-slate-500 text-xs m-0">Set monthly threshold for plan {editingMapping.planName}.</p>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 pt-2">
              <input 
                type="checkbox" 
                checked={editingMapping.unlimited} 
                onChange={e => setEditingMapping({ ...editingMapping, unlimited: e.target.checked, limitValue: e.target.checked ? '' : '100' })} 
              />
              Unlimited usage
            </label>

            {!editingMapping.unlimited && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Limit Threshold Count</label>
                <input 
                  type="number" 
                  value={editingMapping.limitValue} 
                  onChange={e => setEditingMapping({ ...editingMapping, limitValue: e.target.value })}
                  required 
                  className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" 
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button onClick={() => setEditingMapping(null)} className="flex-1 py-3 bg-slate-100 rounded-xl text-xs font-bold border-none cursor-pointer">
                Cancel
              </button>
              <button onClick={handleSaveMappingLimit} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="m-0 text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
            <Activity className="text-indigo-600" /> SaaS Features & Pricing Matrix
          </h2>
          <span className="text-xs text-slate-400 font-bold font-mono">Map core modules to different subscription plans and restrict usage counts.</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => refetchFeats()}
            aria-label="Refresh features"
            className="p-2.5 border rounded-xl hover:bg-slate-100 cursor-pointer bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <RefreshCw size={16} />
          </button>
          {activeSubTab === 'catalog' && (
            <button 
              onClick={() => setIsCreateOpen(true)}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={14} /> Register Feature
            </button>
          )}
        </div>
      </div>

      {/* TAB SUB-SELECTOR */}
      <div className="flex gap-2 border-b">
        <button 
          onClick={() => setActiveSubTab('matrix')}
          className={`py-3 px-6 text-xs font-bold border-b-2 cursor-pointer transition-all border-none bg-transparent ${
            activeSubTab === 'matrix' ? 'border-indigo-600 text-indigo-700 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Plan Feature Matrix Grid
        </button>
        <button 
          onClick={() => setActiveSubTab('catalog')}
          className={`py-3 px-6 text-xs font-bold border-b-2 cursor-pointer transition-all border-none bg-transparent ${
            activeSubTab === 'catalog' ? 'border-indigo-600 text-indigo-700 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Feature Catalog List
        </button>
      </div>

      {/* ─── TAB 1: PLAN FEATURE MATRIX GRID ─── */}
      {activeSubTab === 'matrix' && (
        <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead className="bg-slate-50 border-b text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="p-4 w-64">SaaS Features / Modules</th>
                  {plans?.map(plan => (
                    <th key={plan.id} className="p-4 text-center">{plan.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {features?.map(feat => (
                  <tr key={feat.id} className="hover:bg-slate-50/50 text-slate-700 font-medium">
                    <td className="p-4">
                      <span className="font-bold text-slate-800 block">{feat.name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{feat.code}</span>
                    </td>
                    {plans?.map(plan => {
                      const mapping = getMappingInfo(plan, feat);
                      return (
                        <td key={plan.id} className="p-4 text-center">
                          <div className="flex flex-col items-center justify-center space-y-1.5">
                            {/* Toggle Mapping State */}
                            <button 
                              onClick={() => handleToggleCell(plan, feat)}
                              className="bg-transparent border-none cursor-pointer"
                            >
                              {mapping ? (
                                <span className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                                  <Check size={14} />
                                </span>
                              ) : (
                                <span className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 text-slate-300 flex items-center justify-center hover:border-slate-300">
                                  <X size={14} />
                                </span>
                              )}
                            </button>

                            {/* Limit Value setting */}
                            {mapping && (
                              <button
                                onClick={() => handleEditLimit(plan, feat, mapping)}
                                className="text-[9px] text-slate-500 font-bold hover:underline cursor-pointer border-none bg-transparent"
                              >
                                {mapping.limitValue === null ? 'Unlimited' : `Limit: ${mapping.limitValue}`}
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 2: FEATURE CATALOG LIST ─── */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-2xl p-4">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search feature codes..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl outline-none text-sm"
              />
            </div>
          </div>

          <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead className="bg-slate-50 border-b text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Feature Details</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFeatures?.map(feat => (
                    <tr key={feat.id} className="hover:bg-slate-50 font-medium text-slate-700">
                      <td className="p-4">
                        <strong className="text-slate-800 text-sm">{feat.name}</strong>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{feat.code}</span>
                      </td>
                      <td className="p-4 capitalize">{feat.category || 'Core'}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          feat.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {feat.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleEditClick(feat)} 
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 border-none bg-transparent cursor-pointer"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            onClick={() => { if(confirm('Remove Feature?')) deleteMutation.mutate(feat.id); }}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 hover:text-rose-700 border-none bg-transparent cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
