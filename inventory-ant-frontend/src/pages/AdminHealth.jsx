import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminService } from '../services/adminService';
import { Activity, RefreshCw, AlertTriangle, ShieldCheck, Database, HardDrive, Zap, Mail, Layers } from 'lucide-react';
import '../App.css';

export default function AdminHealth() {
  const { data: health, isLoading, error, refetch } = useQuery({
    queryKey: ['systemHealthLogs'],
    queryFn: AdminService.getSystemHealth,
    staleTime: 5000,
  });

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6 animate-pulse bg-slate-50 text-left">
        <div className="h-10 bg-slate-200 rounded-lg w-48" />
        <div className="h-64 bg-white border rounded-3xl" />
      </div>
    );
  }

  const s = health?.services || {};

  return (
    <div className="p-6 md:p-8 bg-slate-50 flex-1 overflow-y-auto space-y-6 text-left relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="m-0 text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
            <Activity className="text-indigo-600" /> Health Diagnostics
          </h2>
          <span className="text-xs text-slate-400 font-bold font-mono">Real-time status checks on databases, payment gateways, and Brevo mailers.</span>
        </div>
        <button onClick={() => refetch()} className="p-2 border rounded-xl bg-white hover:bg-slate-50 cursor-pointer">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { key: 'database', label: 'Prisma PostgreSQL', icon: <Database />, data: s.database },
          { key: 'payment', label: 'Razorpay POS Gateway', icon: <Activity />, data: s.payment },
          { key: 'subscription', label: 'SaaS Subscription Engine', icon: <Layers />, data: s.subscription },
          { key: 'ai', label: 'Gemini Generative Core', icon: <Zap />, data: s.ai },
          { key: 'email', label: 'Brevo SMTP Mailer', icon: <Mail />, data: s.email },
          { key: 'storage', label: 'Disk Write storage', icon: <HardDrive />, data: s.storage },
        ].map(item => {
          const isUp = item.data?.status === 'UP';
          return (
            <div key={item.key} className="bg-white border rounded-3xl p-6 shadow-sm flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
              }`}>
                {item.icon}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center">
                  <h4 className="m-0 text-sm font-bold text-slate-800">{item.label}</h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    isUp ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {item.data?.status || 'DOWN'}
                  </span>
                </div>
                <p className="m-0 text-xs text-slate-500">{item.data?.message || 'Operational health active. Zero delays recorded.'}</p>
                {item.data?.latency && (
                  <span className="text-[10px] text-slate-400 font-mono block pt-1">Latency: {item.data.latency}ms</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
