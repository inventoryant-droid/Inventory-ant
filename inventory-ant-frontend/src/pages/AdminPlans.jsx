import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Layers, Plus, Trash2, Edit3, ArrowUp, ArrowDown, 
  Search, RefreshCw, Loader2, ToggleLeft, ToggleRight,
  Sparkles, CheckCircle2, AlertTriangle, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../utils/config';
import '../App.css';

export default function AdminPlans() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingPlan, setEditingPlan] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState(0);
  const [yearlyPrice, setYearlyPrice] = useState(0);
  const [trialDays, setTrialDays] = useState(14);
  const [gracePeriodDays, setGracePeriodDays] = useState(7);
  const [popular, setPopular] = useState(false);
  const [recommended, setRecommended] = useState(false);
  const [active, setActive] = useState(true);

  // Feature limits state
  const [selectedFeatures, setSelectedFeatures] = useState({});

  // 1. FETCH PLANS
  const { data: plans, isLoading, error, refetch } = useQuery({
    queryKey: ['adminPlansList'],
    queryFn: () => fetch(`${API_BASE_URL}/api/admin/plans`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('ant_token')}` }
    }).then(res => res.json()),
  });

  // FETCH FEATURES
  const { data: features } = useQuery({
    queryKey: ['adminFeaturesList'],
    queryFn: () => fetch(`${API_BASE_URL}/api/admin/features`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('ant_token')}` }
    }).then(res => res.json()),
  });

  // Sync features list to selection state when features finish loading
  useEffect(() => {
    if (features && Object.keys(selectedFeatures).length === 0) {
      const initialFeatures = {};
      features.forEach(feat => {
        initialFeatures[feat.id] = {
          enabled: false,
          limitValue: '',
          unlimited: true
        };
      });
      setSelectedFeatures(initialFeatures);
    }
  }, [features]);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('ant_token')}`
  });

  // 2. CREATE MUTATION
  const createMutation = useMutation({
    mutationFn: async ({ planData, featuresData }) => {
      // 1. Create plan
      const res = await fetch(`${API_BASE_URL}/api/admin/plans`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(planData)
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || 'Create plan failed');
      }
      const createdPlan = await res.json();

      // 2. Map selected features
      const mappingPromises = Object.entries(featuresData)
        .filter(([_, value]) => value.enabled)
        .map(([featId, value]) => {
          return fetch(`${API_BASE_URL}/api/admin/mappings`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
              planId: createdPlan.id,
              featureId: featId,
              limitValue: value.unlimited ? null : Number(value.limitValue),
              isUnlimited: value.unlimited
            })
          });
        });
      await Promise.all(mappingPromises);
      return createdPlan;
    },
    onSuccess: () => {
      toast.success('New plan and feature mappings created successfully');
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['adminPlansList'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plansCompare'] });
    },
    onError: (err) => toast.error(err.message)
  });

  // 3. UPDATE MUTATION
  const updateMutation = useMutation({
    mutationFn: async ({ id, updatedFields, featuresData }) => {
      // 1. Update plan details
      const res = await fetch(`${API_BASE_URL}/api/admin/plans/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updatedFields)
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || 'Update plan failed');
      }
      const updatedPlan = await res.json();

      // 2. Sync feature mappings
      if (featuresData && editingPlan) {
        const mappingPromises = [];
        const existingFeaturesMap = new Map(
          (editingPlan.features || []).map(f => [f.featureId, f])
        );

        for (const [featId, value] of Object.entries(featuresData)) {
          const existingMapping = existingFeaturesMap.get(featId);

          if (value.enabled) {
            const desiredLimit = value.unlimited ? null : Number(value.limitValue);
            const needsUpdate = !existingMapping || existingMapping.limitValue !== desiredLimit;

            if (needsUpdate) {
              mappingPromises.push(
                fetch(`${API_BASE_URL}/api/admin/mappings`, {
                  method: 'POST',
                  headers: getHeaders(),
                  body: JSON.stringify({
                    planId: id,
                    featureId: featId,
                    limitValue: desiredLimit,
                    isUnlimited: value.unlimited
                  })
                })
              );
            }
          } else {
            if (existingMapping) {
              mappingPromises.push(
                fetch(`${API_BASE_URL}/api/admin/mappings/${id}/${featId}`, {
                  method: 'DELETE',
                  headers: getHeaders()
                })
              );
            }
          }
        }

        await Promise.all(mappingPromises);
      }
      return updatedPlan;
    },
    onSuccess: () => {
      toast.success('Plan and feature mappings updated successfully');
      setEditingPlan(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['adminPlansList'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plansCompare'] });
    },
    onError: (err) => toast.error(err.message)
  });

  // 4. DELETE MUTATION
  const deleteMutation = useMutation({
    mutationFn: (id) => fetch(`${API_BASE_URL}/api/admin/plans/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(res => {
      if (!res.ok) return res.json().then(e => { throw new Error(e.message || 'Delete failed'); });
      return res.json();
    }),
    onSuccess: () => {
      toast.success('Plan deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['adminPlansList'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plansCompare'] });
    },
    onError: (err) => toast.error(err.message)
  });

  // 5. REORDER MUTATION
  const reorderMutation = useMutation({
    mutationFn: (planIds) => fetch(`${API_BASE_URL}/api/admin/plans/reorder`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ planIds })
    }).then(res => res.json()),
    onSuccess: () => {
      toast.success('Plans order updated');
      queryClient.invalidateQueries({ queryKey: ['adminPlansList'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plansCompare'] });
    }
  });

  const resetForm = () => {
    setName('');
    setSlug('');
    setDescription('');
    setMonthlyPrice(0);
    setYearlyPrice(0);
    setTrialDays(14);
    setGracePeriodDays(7);
    setPopular(false);
    setRecommended(false);
    setActive(true);

    const initialFeatures = {};
    if (features) {
      features.forEach(feat => {
        initialFeatures[feat.id] = {
          enabled: false,
          limitValue: '',
          unlimited: true
        };
      });
    }
    setSelectedFeatures(initialFeatures);
  };

  const handleCreateOpenClick = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleEditClick = (plan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setSlug(plan.slug);
    setDescription(plan.description || '');
    setMonthlyPrice(plan.monthlyPrice);
    setYearlyPrice(plan.yearlyPrice);
    setTrialDays(plan.trialDays);
    setGracePeriodDays(plan.gracePeriodDays);
    setPopular(plan.popularBadge ?? plan.popular ?? false);
    setRecommended(plan.recommendedBadge ?? plan.recommended ?? false);
    setActive(plan.isActive ?? plan.active ?? true);

    const initialFeatures = {};
    if (features) {
      features.forEach(feat => {
        const mapping = plan.features?.find(f => f.featureId === feat.id);
        initialFeatures[feat.id] = {
          enabled: !!mapping,
          limitValue: mapping ? (mapping.limitValue !== null ? mapping.limitValue : '') : '',
          unlimited: mapping ? mapping.limitValue === null : true
        };
      });
    }
    setSelectedFeatures(initialFeatures);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      planData: {
        name, slug, description,
        monthlyPrice: Number(monthlyPrice),
        yearlyPrice: Number(yearlyPrice),
        trialDays: Number(trialDays),
        gracePeriodDays: Number(gracePeriodDays),
        popular, recommended, active
      },
      featuresData: selectedFeatures
    });
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      id: editingPlan.id,
      updatedFields: {
        name, slug, description,
        monthlyPrice: Number(monthlyPrice),
        yearlyPrice: Number(yearlyPrice),
        trialDays: Number(trialDays),
        gracePeriodDays: Number(gracePeriodDays),
        popular, recommended, active
      },
      featuresData: selectedFeatures
    });
  };

  const handleMove = (index, direction) => {
    if (!plans) return;
    const newPlans = [...plans];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newPlans.length) return;

    // Swap elements
    const temp = newPlans[index];
    newPlans[index] = newPlans[targetIdx];
    newPlans[targetIdx] = temp;

    const planIds = newPlans.map(p => p.id);
    reorderMutation.mutate(planIds);
  };

  const filteredPlans = plans?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.slug.toLowerCase().includes(search.toLowerCase())
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
      
      {/* ─── CREATE / EDIT PLAN DIALOG MODALS ─── */}
      {(isCreateOpen || editingPlan) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={isCreateOpen ? handleCreateSubmit : handleUpdateSubmit} 
            className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full space-y-4 shadow-2xl text-left max-h-[90vh] overflow-y-auto"
          >
            <h3 className="m-0 text-base font-extrabold text-slate-800">
              {isCreateOpen ? 'Create SaaS Plan' : `Update Plan: ${editingPlan?.name}`}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Plan Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Slug (Unique identifier)</label>
                <input type="text" value={slug} onChange={e => setSlug(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Description</label>
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Monthly Price (INR)</label>
                <input type="number" value={monthlyPrice} onChange={e => setMonthlyPrice(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Yearly Price (INR)</label>
                <input type="number" value={yearlyPrice} onChange={e => setYearlyPrice(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Trial Period (Days)</label>
                <input type="number" value={trialDays} onChange={e => setTrialDays(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Grace Period (Days)</label>
                <input type="number" value={gracePeriodDays} onChange={e => setGracePeriodDays(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none" />
              </div>
            </div>

            {/* Checkbox badges options */}
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input type="checkbox" checked={popular} onChange={e => setPopular(e.target.checked)} />
                Popular Badge
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input type="checkbox" checked={recommended} onChange={e => setRecommended(e.target.checked)} />
                Recommended Badge
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
                Active (Visible)
              </label>
            </div>

            {/* PLAN FEATURES SELECTION AND LIMIT CONFIGURATION */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-700 m-0 uppercase tracking-wider">Plan Features & Limits Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {features?.map(feat => {
                  const state = selectedFeatures[feat.id] || { enabled: false, limitValue: '', unlimited: true };
                  return (
                    <div key={feat.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={state.enabled} 
                            onChange={e => {
                              setSelectedFeatures({
                                ...selectedFeatures,
                                [feat.id]: {
                                  ...state,
                                  enabled: e.target.checked
                                }
                              });
                            }} 
                          />
                          <div>
                            <span className="block text-slate-800 font-extrabold">{feat.name}</span>
                            <span className="block text-[9px] text-slate-400 font-mono font-bold">{feat.code}</span>
                          </div>
                        </label>
                        <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded uppercase">
                          {feat.category || 'Core'}
                        </span>
                      </div>
                      
                      {state.enabled && (
                        <div className="flex items-center gap-3 pl-6 pt-1 border-t border-dashed border-slate-200 mt-1">
                          <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={state.unlimited} 
                              onChange={e => {
                                setSelectedFeatures({
                                  ...selectedFeatures,
                                  [feat.id]: {
                                    ...state,
                                    unlimited: e.target.checked,
                                    limitValue: e.target.checked ? '' : '100'
                                  }
                                });
                              }} 
                            />
                            Unlimited
                          </label>
                          
                          {!state.unlimited && (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <span className="text-[9px] uppercase font-extrabold text-slate-400">Limit:</span>
                              <input 
                                type="number" 
                                value={state.limitValue} 
                                onChange={e => {
                                  setSelectedFeatures({
                                    ...selectedFeatures,
                                    [feat.id]: {
                                      ...state,
                                      limitValue: e.target.value
                                    }
                                  });
                                }}
                                required 
                                className="w-16 p-1 bg-white border border-slate-250 rounded-lg outline-none text-xs text-center font-bold text-slate-700" 
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => { setIsCreateOpen(false); setEditingPlan(null); resetForm(); }} 
                className="flex-1 py-3 bg-slate-100 rounded-xl text-xs font-bold border-none cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer flex items-center justify-center gap-1.5"
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="animate-spin" size={12} />}
                Confirm Plan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="m-0 text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
            <Layers className="text-indigo-600" /> SaaS Pricing Plans
          </h2>
          <span className="text-xs text-slate-400 font-bold font-mono">Create, toggle visibility, price structures, trials, and reorder active pricing items.</span>
        </div>
        <button 
          onClick={handleCreateOpenClick}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer flex items-center gap-1.5"
        >
          <Plus size={14} /> Create Plan
        </button>
      </div>

      {/* FILTER SEARCH PANEL */}
      <div className="bg-white border rounded-2xl p-4 flex gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search plans name or slug..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl outline-none text-sm"
          />
        </div>
      </div>

      {/* PLANS TABLE LIST */}
      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead className="bg-slate-50 border-b text-slate-400 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-4 text-center">Rank</th>
                <th className="p-4">Plan Name</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Monthly Price</th>
                <th className="p-4">Yearly Price</th>
                <th className="p-4 text-center">Trial / Grace</th>
                <th className="p-4 text-center">Badges</th>
                <th className="p-4 text-center">Visibility</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlans?.map((plan, index) => (
                <tr key={plan.id} className="hover:bg-slate-50 font-medium text-slate-700">
                  {/* Rank & Reorder Move Actions */}
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => handleMove(index, -1)} 
                        disabled={index === 0}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-30 cursor-pointer border-none bg-transparent"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button 
                        onClick={() => handleMove(index, 1)} 
                        disabled={index === (plans.length - 1)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-30 cursor-pointer border-none bg-transparent"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-slate-800">{plan.name}</td>
                  <td className="p-4 font-mono">{plan.slug}</td>
                  <td className="p-4">₹{plan.monthlyPrice}</td>
                  <td className="p-4">₹{plan.yearlyPrice}</td>
                  <td className="p-4 text-center">{plan.trialDays}d / {plan.gracePeriodDays}d</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-1">
                      {(plan.popularBadge ?? plan.popular) && <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded">Popular</span>}
                      {(plan.recommendedBadge ?? plan.recommended) && <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded">Recommended</span>}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => {
                        const isCurrentlyActive = plan.isActive ?? plan.active ?? true;
                        updateMutation.mutate({ id: plan.id, updatedFields: { active: !isCurrentlyActive } });
                      }}
                      className="bg-transparent border-none cursor-pointer"
                    >
                      {(plan.isActive ?? plan.active ?? true) ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-slate-300" />}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => handleEditClick(plan)} 
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 border-none bg-transparent cursor-pointer"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => { if(confirm('Delete plan?')) deleteMutation.mutate(plan.id); }}
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
  );
}
