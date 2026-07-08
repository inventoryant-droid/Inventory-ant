import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminService } from '../services/adminService';
import { Sparkles, Save, Info, RefreshCw, Loader2, Cpu, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../utils/config';
import '../App.css';

export default function AdminAIConfig() {
  const queryClient = useQueryClient();

  // Fetch current configs
  const { data: configs, isLoading, refetch } = useQuery({
    queryKey: ['adminAiConfigList'],
    queryFn: AdminService.getAiConfigs,
    staleTime: 10000,
  });

  // Local state for all fields
  const [model, setModel] = useState('gemini-1.5-flash');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [ocrLimit, setOcrLimit] = useState(100);
  const [voiceLimit, setVoiceLimit] = useState(500);
  const [dailyScanLimit, setDailyScanLimit] = useState(20);
  const [costPerCall, setCostPerCall] = useState(0.005);

  // Initialize fields once configs load
  useEffect(() => {
    if (configs) {
      configs.forEach(cfg => {
        const val = typeof cfg.value === 'string' ? JSON.parse(cfg.value) : cfg.value;
        if (cfg.key === 'GEMINI_MODEL') setModel(val);
        if (cfg.key === 'GEMINI_TEMPERATURE') setTemperature(Number(val));
        if (cfg.key === 'GEMINI_MAX_TOKENS') setMaxTokens(Number(val));
        if (cfg.key === 'OCR_MONTHLY_LIMIT') setOcrLimit(Number(val));
        if (cfg.key === 'VOICE_MONTHLY_LIMIT') setVoiceLimit(Number(val));
        if (cfg.key === 'DAILY_SCAN_LIMIT') setDailyScanLimit(Number(val));
        if (cfg.key === 'AI_COST_PER_CALL') setCostPerCall(Number(val));
      });
    }
  }, [configs]);

  const updateMutation = useMutation({
    mutationFn: ({ key, value, description }) => fetch(`${API_BASE_URL}/api/admin/ai-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ant_token')}`,
      },
      body: JSON.stringify({ key, value, description })
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAiConfigList'] });
    }
  });

  const handleSaveAll = async () => {
    try {
      toast('Saving cognitive configs...', { icon: '🤖' });
      await Promise.all([
        updateMutation.mutateAsync({ key: 'GEMINI_MODEL', value: model, description: 'Active Gemini generative model' }),
        updateMutation.mutateAsync({ key: 'GEMINI_TEMPERATURE', value: Number(temperature), description: 'Creativity temperature (0.0 to 1.0)' }),
        updateMutation.mutateAsync({ key: 'GEMINI_MAX_TOKENS', value: Number(maxTokens), description: 'Max tokens per conversational output' }),
        updateMutation.mutateAsync({ key: 'OCR_MONTHLY_LIMIT', value: Number(ocrLimit), description: 'Max document OCR scans per B2B owner' }),
        updateMutation.mutateAsync({ key: 'VOICE_MONTHLY_LIMIT', value: Number(voiceLimit), description: 'Max voice commands per tenant' }),
        updateMutation.mutateAsync({ key: 'DAILY_SCAN_LIMIT', value: Number(dailyScanLimit), description: 'Max scan uploads per day' }),
        updateMutation.mutateAsync({ key: 'AI_COST_PER_CALL', value: Number(costPerCall), description: 'Simulated API cost limit per request' }),
      ]);
      toast.success('Cognitive variables synchronized');
    } catch (e) {
      toast.error('Sync failed');
    }
  };

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
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="m-0 text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
            <Sparkles className="text-indigo-600" /> AI Configurations
          </h2>
          <span className="text-xs text-slate-400 font-bold font-mono">Fine-tune generative model params, daily quotas limits and cost control bounds.</span>
        </div>
        <button 
          onClick={handleSaveAll}
          disabled={updateMutation.isPending}
          className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer flex items-center gap-1.5"
        >
          {updateMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save Configurations
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Model tuning params */}
        <div className="lg:col-span-2 bg-white border rounded-3xl p-6 space-y-6 shadow-sm">
          <h3 className="m-0 text-sm font-extrabold text-slate-800 border-b pb-3 flex items-center gap-2">
            <Cpu size={16} className="text-indigo-600" /> Gemini Generative LLM Parameters
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Generative Model Key</label>
              <select value={model} onChange={e => setModel(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none text-xs">
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Balanced)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Experimental)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Max Tokens response limit</label>
              <input type="number" value={maxTokens} onChange={e => setMaxTokens(e.target.value)} required className="w-full p-3 bg-slate-50 border rounded-xl outline-none" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400">
              <span>Model Temperature</span>
              <span className="font-mono text-indigo-600 font-extrabold">{temperature}</span>
            </div>
            <input 
              type="range" 
              min="0.0" 
              max="1.0" 
              step="0.1" 
              value={temperature} 
              onChange={e => setTemperature(Number(e.target.value))} 
              className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-[10px] text-slate-400 block pt-1">Lower temperatures yield predictable answers, higher values spark creativity.</span>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-2.5 text-indigo-800 text-xs">
            <Info size={16} className="shrink-0 mt-0.5" />
            <p className="m-0 leading-relaxed">
              These model variables are passed directly to the backend conversational API engines. Updating them alters the responsiveness parameters instantly.
            </p>
          </div>
        </div>

        {/* Quotas & Limits config */}
        <div className="bg-white border rounded-3xl p-6 space-y-5 shadow-sm">
          <h3 className="m-0 text-sm font-extrabold text-slate-800 border-b pb-3 flex items-center gap-2">
            <Settings size={16} className="text-indigo-600" /> Usage Thresholds
          </h3>

          <div className="space-y-4">
            <div className="space-y-1 text-left">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">OCR Document Limits (Monthly)</label>
              <input type="number" value={ocrLimit} onChange={e => setOcrLimit(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-xs" />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Voice commands Quota (Monthly)</label>
              <input type="number" value={voiceLimit} onChange={e => setVoiceLimit(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-xs" />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Daily Stock scan limits</label>
              <input type="number" value={dailyScanLimit} onChange={e => setDailyScanLimit(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-xs" />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Simulated cost limit per request ($)</label>
              <input type="number" step="0.001" value={costPerCall} onChange={e => setCostPerCall(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-xs" />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
