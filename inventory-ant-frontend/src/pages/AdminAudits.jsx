import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminService } from '../services/adminService';
import { Database, Search, RefreshCw, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PageSkeleton, PageError, EmptyState, SectionHeader } from '../components/ui/SharedUI';
import '../App.css';

export default function AdminAudits() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // 1. FETCH LOGS
  const { data: logs, isLoading, error, refetch } = useQuery({
    queryKey: ['adminAuditsList'],
    queryFn: AdminService.getLogs,
    staleTime: 5000,
  });

  const handleExportCSV = () => {
    if (!logs) return;
    const headers = 'Log ID,User ID,Username,Role,Action,IP Address,Device,Timestamp\n';
    const rows = logs.map(l => 
      `"${l.id}","${l.userId}","${l.userName}","${l.role}","${l.action.replace(/"/g, '""')}","${l.ip}","${l.device}","${new Date(l.timestamp).toLocaleString()}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `system_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Audit logs downloaded as CSV');
  };

  const filteredLogs = logs?.filter(l => {
    const matchesSearch = l.userId.toLowerCase().includes(search.toLowerCase()) || 
                          l.action.toLowerCase().includes(search.toLowerCase());
    if (roleFilter === 'all') return matchesSearch;
    return matchesSearch && l.role === roleFilter;
  });

  if (isLoading) return <PageSkeleton rows={2} cols={0} />;
  if (error) return <PageError message="Could not load audit event logs." onRetry={refetch} />;

  return (
    <div className="p-6 md:p-8 bg-slate-50 flex-1 overflow-y-auto space-y-6 text-left relative">
      
      {/* HEADER */}
      <SectionHeader
        title="Audit Logs Center"
        subtitle="Real-time system event logging, security handshakes, and access audits across all users."
        icon={Database}
        action={
          <button
            onClick={handleExportCSV}
            aria-label="Export audit logs as CSV"
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <Download size={14} aria-hidden="true" /> Export (.csv)
          </button>
        }
      />

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border p-4 rounded-2xl shadow-sm">
        <div className="relative md:col-span-2">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search email, username, or action..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl outline-none text-sm"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'user', 'admin'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer capitalize ${
                roleFilter === role 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead className="bg-slate-50 border-b text-slate-400 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-4">Log ID</th>
                <th className="p-4">User Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Action message</th>
                <th className="p-4">Host IP</th>
                <th className="p-4">Device</th>
                <th className="p-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs?.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 text-slate-700">
                  <td className="p-4 font-bold text-slate-800">#{log.id.slice(0, 8)}</td>
                  <td className="p-4 font-sans">{log.userId}</td>
                  <td className="p-4 capitalize font-sans">{log.role}</td>
                  <td className="p-4 font-sans text-xs text-slate-800">{log.action}</td>
                  <td className="p-4">{log.ip}</td>
                  <td className="p-4 text-slate-400">{log.device}</td>
                  <td className="p-4 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
