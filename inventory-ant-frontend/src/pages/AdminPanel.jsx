import { API_BASE_URL } from '../utils/config';
import React, { useState, useEffect } from 'react';
import { 
  Users, Trash2, KeyRound, ShieldAlert, Search, UserCheck, UserX, 
  BarChart3, Package, X, Mail, Phone, Calendar, Info, Clock, 
  AlertTriangle, Building, MapPin, Sparkles, User, CreditCard, 
  Activity, Cpu, Bell, Shield, ArrowUpRight, CheckCircle2, 
  UserCog, Ban, RefreshCw, Layers, Edit2, Check, LogOut
} from 'lucide-react';
import PasswordInput from '../components/ui/PasswordInput';

// Custom SVG Chart Components for Tab 1
function RevenueChart({ data }) {
  const width = 500;
  const height = 200;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxVal = Math.max(...data.map(d => d.value)) * 1.15 || 1000;
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = height - padding - (d.value / maxVal) * chartHeight;
    return { x, y, label: d.label, value: d.value };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = points.length ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` : '';
  const [hoveredIdx, setHoveredIdx] = useState(null);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <CreditCard size={16} className="text-emerald-600" />
          Monthly Revenue Growth (INR)
        </h3>
        {hoveredIdx !== null && (
          <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
            {data[hoveredIdx].label}: {data[hoveredIdx].value} INR
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[180px] overflow-visible">
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Y Axis Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding + ratio * chartHeight;
          const val = Math.round(maxVal * (1 - ratio));
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#F1F5F9" strokeWidth="1" />
              <text x={padding - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[8px] font-mono font-bold">{val}</text>
            </g>
          );
        })}
        {/* Area */}
        {areaD && <path d={areaD} fill="url(#revenueGrad)" />}
        {/* Line */}
        {pathD && <path d={pathD} fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {/* Interactive Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle 
              cx={p.x} 
              cy={p.y} 
              r={hoveredIdx === i ? 6 : 4} 
              className="fill-indigo-600 stroke-white stroke-2 cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
            {/* X Labels */}
            <text x={p.x} y={height - 12} textAnchor="middle" className="fill-slate-400 text-[8px] font-bold uppercase">{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function BillsBarChart({ data }) {
  const width = 500;
  const height = 200;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxVal = Math.max(...data.map(d => d.value)) * 1.15 || 10;
  const barWidth = (chartWidth / data.length) * 0.6;
  const spacing = (chartWidth / data.length) * 0.4;

  const [hoveredIdx, setHoveredIdx] = useState(null);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <BarChart3 size={16} className="text-emerald-600" />
          Daily Bill Generations
        </h3>
        {hoveredIdx !== null && (
          <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
            {data[hoveredIdx].label}: {data[hoveredIdx].value} Bills
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[180px] overflow-visible">
        {/* Y Axis Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding + ratio * chartHeight;
          const val = Math.round(maxVal * (1 - ratio));
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#F1F5F9" strokeWidth="1" />
              <text x={padding - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[8px] font-mono font-bold">{val}</text>
            </g>
          );
        })}
        {/* Bars */}
        {data.map((d, i) => {
          const x = padding + i * (barWidth + spacing) + spacing / 2;
          const barHeight = (d.value / maxVal) * chartHeight;
          const y = height - padding - barHeight;
          const isHovered = hoveredIdx === i;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                className={`${isHovered ? 'fill-emerald-500' : 'fill-emerald-400'} cursor-pointer transition-all duration-150`}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              {/* X Labels */}
              <text x={x + barWidth / 2} y={height - 12} textAnchor="middle" className="fill-slate-400 text-[8px] font-bold uppercase">{p => p.label || d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function RegistrationSparkline({ data }) {
  const width = 120;
  const height = 40;
  const maxVal = Math.max(...data) * 1.1 || 10;
  const minVal = Math.min(...data) || 0;
  const range = maxVal - minVal || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - minVal) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-[120px] h-[40px] overflow-visible">
      <polyline
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - ((data[data.length - 1] - minVal) / range) * height}
          r="3"
          className="fill-purple-600 animate-pulse"
        />
      )}
    </svg>
  );
}

export default function AdminPanel({ token, onLogout, userProfile }) {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminRole, setAdminRole] = useState('super_admin');
  
  // Data State
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalProducts: 0
  });

  // DB file sizes and node metrics
  const [systemMetrics, setSystemMetrics] = useState(null);
  
  // Ticketing, logs, payments, announcements state
  const [tickets, setTickets] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [announcement, setAnnouncement] = useState({ target: 'all', title: '', message: '' });
  
  // User edit modal popup state variables
  const [selectedUserPlan, setSelectedUserPlan] = useState(null);
  const [newPlanType, setNewPlanType] = useState('free');
  const [newPlanValidity, setNewPlanValidity] = useState(30);

  const [selectedUserReset, setSelectedUserReset] = useState(null);
  const [resetPassVal, setResetPassVal] = useState('tempPassword123');
  const [adminConfirm, setAdminConfirm] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // Pricing & Limits configuration settings
  const [plansConfig, setPlansConfig] = useState({
    free: { price: 0, staffLimit: 1, productLimit: 50, storageLimit: '100MB', tokens: 10 },
    basic: { price: 999, staffLimit: 5, productLimit: 500, storageLimit: '2GB', tokens: 100 },
    pro: { price: 2999, staffLimit: 15, productLimit: 5000, storageLimit: '10GB', tokens: 500 },
    enterprise: { price: 9999, staffLimit: 99, productLimit: 50000, storageLimit: '100GB', tokens: 5000 },
  });
  const [editingPlan, setEditingPlan] = useState(null);

  // General notification message
  const [message, setMessage] = useState({ text: '', type: '' });
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');

  // Extract adminRole from profile or fallback decode jwt
  useEffect(() => {
    if (userProfile && userProfile.adminRole) {
      setAdminRole(userProfile.adminRole);
    } else {
      // Decode JWT safely if possible
      try {
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64));
        if (payload.adminRole) {
          setAdminRole(payload.adminRole);
        }
      } catch (e) {}
    }
  }, [userProfile, token]);

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // RBAC Permission check helper
  const hasAccess = (tab) => {
    if (adminRole === 'super_admin') return true;
    if (adminRole === 'support_admin') {
      return ['dashboard', 'businesses', 'analytics', 'support', 'logs'].includes(tab);
    }
    if (adminRole === 'finance_admin') {
      return ['dashboard', 'subscriptions', 'analytics', 'payments', 'system'].includes(tab);
    }
    if (adminRole === 'tech_admin') {
      return ['dashboard', 'system', 'logs', 'notifications', 'settings'].includes(tab);
    }
    return false;
  };

  // Adjust active tab if active role does not have access
  useEffect(() => {
    if (!hasAccess(activeTab)) {
      if (hasAccess('dashboard')) setActiveTab('dashboard');
      else if (hasAccess('businesses')) setActiveTab('businesses');
      else if (hasAccess('system')) setActiveTab('system');
    }
  }, [adminRole]);

  // Load and refresh administrative dataset
  const fetchAllData = async () => {
    if (!token) return;
    try {
      // 1. Fetch Users
      const userRes = await fetch(searchQuery 
        ? `${API_BASE_URL}/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`
        : `${API_BASE_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const userData = await userRes.json();
      if (Array.isArray(userData)) {
        setUsers(userData);
      }

      // 2. Fetch Stats
      const statRes = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statData = await statRes.json();
      if (statData && !statData.statusCode) {
        setStats(statData);
      }

      // 3. Conditional fetches based on RBAC permissions
      if (hasAccess('support')) {
        const ticketRes = await fetch(`${API_BASE_URL}/api/admin/tickets`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const ticketData = await ticketRes.json();
        if (Array.isArray(ticketData)) setTickets(ticketData);
      }

      if (hasAccess('payments')) {
        const paymentRes = await fetch(`${API_BASE_URL}/api/admin/payments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const paymentData = await paymentRes.json();
        if (Array.isArray(paymentData)) setPayments(paymentData);
      }

      if (hasAccess('logs')) {
        const logRes = await fetch(`${API_BASE_URL}/api/admin/logs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const logData = await logRes.json();
        if (Array.isArray(logData)) setActivityLogs(logData);
      }

      if (hasAccess('system')) {
        const sysRes = await fetch(`${API_BASE_URL}/api/admin/system`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const sysData = await sysRes.json();
        if (sysData && !sysData.statusCode) setSystemMetrics(sysData);
      }

    } catch (e) {
      console.error("Administrative fetch failed:", e);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token, searchQuery, activeTab]);

  // Actions handlers
  const handleDeactivate = (email) => {
    setAdminConfirm({
      isOpen: true,
      title: 'Deactivate Account',
      message: `Are you sure you want to deactivate ${email}?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/admin/users/${encodeURIComponent(email)}/deactivate`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            showToast('Account deactivated successfully', 'success');
            fetchAllData();
            if (selectedUser && selectedUser.email === email) {
              setSelectedUser(prev => prev ? { ...prev, active: false } : null);
            }
          } else {
            showToast(data.message || 'Failed to deactivate account', 'error');
          }
        } catch (e) {
          showToast('API Request failure', 'error');
        }
      }
    });
  };

  const handleActivate = (email) => {
    setAdminConfirm({
      isOpen: true,
      title: 'Activate Account',
      message: `Are you sure you want to activate account ${email}?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/admin/users/${encodeURIComponent(email)}/activate`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            showToast('Account activated successfully', 'success');
            fetchAllData();
            if (selectedUser && selectedUser.email === email) {
              setSelectedUser(prev => prev ? { ...prev, active: true } : null);
            }
          } else {
            showToast(data.message || 'Failed to activate account', 'error');
          }
        } catch (e) {
          showToast('API Request failure', 'error');
        }
      }
    });
  };

  const handleHardDelete = (email) => {
    setAdminConfirm({
      isOpen: true,
      title: 'CRITICAL: Hard Delete Account',
      message: `Are you sure you want to hard delete ${email}? This will strip all matching user parameters, staff logs, inventories, billing transaction files, and scans across ALL databases. This process cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/admin/users/${encodeURIComponent(email)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            showToast('Account & associated records hard deleted', 'success');
            setSelectedUser(null);
            fetchAllData();
          } else {
            showToast(data.message || 'Deletion error', 'error');
          }
        } catch (e) {
          showToast('API Request failure', 'error');
        }
      }
    });
  };

  const handlePlanUpdate = async (e) => {
    e.preventDefault();
    if (!selectedUserPlan) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${encodeURIComponent(selectedUserPlan.email)}/plan`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: newPlanType, validityInDays: Number(newPlanValidity) })
      });
      const data = await res.json();
      if (data.email) {
        showToast(`Upgraded ${data.email} to ${data.plan.toUpperCase()}`, 'success');
        setSelectedUserPlan(null);
        fetchAllData();
      } else {
        showToast('Failed to modify plan', 'error');
      }
    } catch (e) {
      showToast('Plan API Failure', 'error');
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!selectedUserReset) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${encodeURIComponent(selectedUserReset.email)}/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPass: resetPassVal })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Credentials modified for ${selectedUserReset.email}`, 'success');
        setSelectedUserReset(null);
        setResetPassVal('tempPassword123');
      } else {
        showToast('Reset password failed', 'error');
      }
    } catch (e) {
      showToast('API Failure', 'error');
    }
  };

  const handleImpersonate = async (email) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/impersonate/${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.access_token) {
        // Backup original admin state in storage
        localStorage.setItem('ant_admin_token', token);
        localStorage.setItem('ant_admin_user', localStorage.getItem('ant_user') || 'admin@inventoryant.com');
        localStorage.setItem('ant_admin_role', 'admin');
        
        // Load impersonated identity
        localStorage.setItem('ant_token', data.access_token);
        localStorage.setItem('ant_user', data.user.email);
        localStorage.setItem('ant_role', data.user.role);
        
        showToast('Spinning user context workspace...', 'success');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 800);
      } else {
        showToast('Identity override reject by server', 'error');
      }
    } catch (e) {
      showToast('Impersonate failure', 'error');
    }
  };

  // Support Inbox
  const handleAssignTicket = async (ticketId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/tickets/${ticketId}/assign`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Ticket assigned to you', 'success');
        fetchAllData();
      }
    } catch (e) {}
  };

  const handleResolveTicket = async (ticketId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'resolved' })
      });
      if (res.ok) {
        showToast('Ticket marked as resolved', 'success');
        fetchAllData();
      }
    } catch (e) {}
  };

  // Payments / Transaction refunds
  const handleRefundTransaction = (txnId) => {
    setAdminConfirm({
      isOpen: true,
      title: 'Refund Transaction',
      message: 'Trigger instant refund for this invoice?',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/admin/payments/refund`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ txnId })
          });
          const data = await res.json();
          if (data.status === 'refunded') {
            showToast('Payment refunded successfully', 'success');
            fetchAllData();
          }
        } catch (e) {}
      }
    });
  };

  // Announcements Broadcast
  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/notifications`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(announcement)
      });
      const data = await res.json();
      if (data.id) {
        showToast(`Broadcasting message to tier: ${announcement.target.toUpperCase()}`, 'success');
        setAnnouncement({ target: 'all', title: '', message: '' });
        fetchAllData();
      }
    } catch (e) {}
  };

  const handleChangeConsolePassword = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPass, newPass })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Console credentials updated', 'success');
        setOldPass('');
        setNewPass('');
      } else {
        showToast(data.message || 'Credentials failure', 'error');
      }
    } catch (err) {
      showToast('Reset console API error', 'error');
    }
  };

  // Derived Admin Panel stats computed client side
  const ownerUsers = users.filter(u => u.role === 'user');
  const staffAccountsCount = users.filter(u => u.role === 'staff').length;
  
  const activeSubscriptionsCount = ownerUsers.filter(u => u.plan && u.plan !== 'free' && u.validUntil && u.validUntil > Date.now()).length;
  const expiredPlansCount = ownerUsers.filter(u => u.plan && u.plan !== 'free' && u.validUntil && u.validUntil < Date.now()).length;
  
  const totalRevenue = payments.filter(p => p.status === 'success').reduce((acc, p) => acc + p.amount, 0);

  // Mock static values for SVGs
  const mockRevenueData = [
    { label: 'Jan', value: Math.round(totalRevenue * 0.4) || 2999 },
    { label: 'Feb', value: Math.round(totalRevenue * 0.5) || 3998 },
    { label: 'Mar', value: Math.round(totalRevenue * 0.6) || 5997 },
    { label: 'Apr', value: Math.round(totalRevenue * 0.8) || 6996 },
    { label: 'May', value: Math.round(totalRevenue * 0.9) || 8995 },
    { label: 'Jun', value: totalRevenue || 9996 }
  ];

  const mockBillsData = [
    { label: 'Mon', value: 12 },
    { label: 'Tue', value: 19 },
    { label: 'Wed', value: 27 },
    { label: 'Thu', value: 22 },
    { label: 'Fri', value: 34 },
    { label: 'Sat', value: 41 },
    { label: 'Sun', value: 38 }
  ];

  const mockSparklineData = [1, 3, 2, 4, 3, 5, 4, 6, 8, stats.totalUsers || 4];

  // Nav Roster of 10 Tabs (Filtered by active RBAC rules)
  const tabsList = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} /> },
    { id: 'businesses', label: 'Businesses', icon: <Building size={16} /> },
    { id: 'subscriptions', label: 'Subscriptions', icon: <Layers size={16} /> },
    { id: 'analytics', label: 'Staff Analytics', icon: <Users size={16} /> },
    { id: 'payments', label: 'Revenue Management', icon: <CreditCard size={16} /> },
    { id: 'support', label: 'Support Center', icon: <Mail size={16} /> },
    { id: 'system', label: 'System Monitoring', icon: <Cpu size={16} /> },
    { id: 'logs', label: 'Activity Logs', icon: <Activity size={16} /> },
    { id: 'notifications', label: 'Notification Center', icon: <Bell size={16} /> },
    { id: 'settings', label: 'Settings', icon: <KeyRound size={16} /> }
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-[#F8FAFC] min-h-screen">
      
      {/* Sub Sidebar Navigation Panel */}
      <div className="w-full md:w-[240px] bg-slate-900 text-slate-300 p-5 shrink-0 flex flex-col border-r border-slate-800 shadow-xl font-sans">
        <div className="mb-6">
          <div className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Console Domain</div>
          <h2 className="text-sm font-extrabold text-white mt-1 flex items-center gap-1.5 leading-none">
            <ShieldAlert size={16} className="text-emerald-400" />
            {adminRole === 'super_admin' && 'Super Administrator'}
            {adminRole === 'support_admin' && 'Support Portal'}
            {adminRole === 'finance_admin' && 'Finance Portal'}
            {adminRole === 'tech_admin' && 'Technical Console'}
          </h2>
          <div className="text-[8px] bg-emerald-950 text-emerald-300 font-bold border border-emerald-900 rounded px-1.5 py-0.5 mt-2 w-max uppercase tracking-wider font-mono">
            Mode: RBAC Active
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex flex-col gap-1.5 flex-1 mt-4">
          {tabsList.map(tab => {
            const visible = hasAccess(tab.id);
            if (!visible) return null;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 text-left border-none py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isTabActive
                    ? 'bg-[#0f9d63] text-white shadow-md shadow-indigo-600/20'
                    : 'bg-transparent text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Divider / Spacer */}
        <div className="border-t border-slate-800 my-4" />

        {/* Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-2.5 text-left border-none py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-transparent text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 mb-4"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        )}

        {message.text && (
          <div className={`mt-auto p-3.5 rounded-xl border text-[10px] font-bold shadow-sm transition-all duration-300 animate-fadeIn ${
            message.type === 'success' 
              ? 'bg-emerald-950 border-emerald-900 text-emerald-300' 
              : 'bg-red-950 border-red-900 text-red-300'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Main Tab Content Panel */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* VIEW 1: Dashboard Panel */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                <BarChart3 size={32} className="text-emerald-600" />
                Administrative Dashboard
              </h1>
              <p className="text-slate-500 text-xs mt-1">Realtime overview of business metrics, registrations, and payment audits.</p>
            </div>

            {/* Statistics Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Building size={20} />
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Businesses</div>
                  <div className="text-xl font-black text-slate-800 mt-0.5">{stats.totalUsers}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <UserCheck size={20} />
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Active Users</div>
                  <div className="text-xl font-black text-slate-800 mt-0.5">{stats.activeUsers}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Staff Accounts</div>
                  <div className="text-xl font-black text-slate-800 mt-0.5">{staffAccountsCount}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Package size={20} />
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Products</div>
                  <div className="text-xl font-black text-slate-800 mt-0.5">{stats.totalProducts}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                  <CreditCard size={20} />
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Monthly Revenue</div>
                  <div className="text-xl font-black text-slate-800 mt-0.5">{totalRevenue} INR</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                  <Layers size={20} />
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Active Subs</div>
                  <div className="text-xl font-black text-slate-800 mt-0.5">{activeSubscriptionsCount}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Ban size={20} />
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Expired Plans</div>
                  <div className="text-xl font-black text-slate-800 mt-0.5">{expiredPlansCount}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition">
                <div className="flex flex-col">
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">New Registrations</div>
                  <div className="text-xs text-slate-400 font-bold mt-1">Trend Curve</div>
                </div>
                <RegistrationSparkline data={mockSparklineData} />
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueChart data={mockRevenueData} />
              <BillsBarChart data={mockBillsData} />
            </div>
          </div>
        )}

        {/* VIEW 2: Businesses management Table */}
        {activeTab === 'businesses' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Building size={24} className="text-emerald-600" />
                  Business Management
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">Control business configurations, suspend/activate accounts, and adjust licenses.</p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs outline-none transition-all placeholder-slate-400 text-slate-700 font-semibold"
                />
              </div>
            </div>

            {/* Businesses Owner Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6">Business & Owner</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Current Plan</th>
                      <th className="p-4">Validity</th>
                      <th className="p-4 text-right pr-6">Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.filter(u => u.role === 'user').length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-12 text-center text-slate-400 font-medium text-xs">
                          No business owner accounts match criteria.
                        </td>
                      </tr>
                    ) : (
                      users.filter(u => u.role === 'user').map(owner => (
                        <tr key={owner.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 pl-6">
                            <div 
                              onClick={() => setSelectedUser(owner)}
                              className="flex items-center gap-3 cursor-pointer group"
                              title="Click to view full details"
                            >
                              {owner.businessLogo ? (
                                <img src={owner.businessLogo} alt="Logo" className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0">
                                  {owner.businessName ? owner.businessName.charAt(0) : owner.name.charAt(0)}
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="font-extrabold text-xs text-slate-800 group-hover:text-emerald-600 transition">{owner.businessName || 'Not Onboarded'}</span>
                                <span className="text-[9px] text-slate-400 font-medium font-mono">{owner.name} ({owner.email})</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                              owner.active
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                : 'bg-rose-50 border-rose-100 text-rose-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${owner.active ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                              {owner.active ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-bold uppercase">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                              owner.plan === 'pro' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                              owner.plan === 'enterprise' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              owner.plan === 'basic' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {owner.plan || 'free'}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-semibold text-slate-600 font-mono">
                            {owner.validUntil ? new Date(owner.validUntil).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-4 text-right pr-6 flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleImpersonate(owner.email)}
                              className="px-2.5 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-[10px] font-bold transition flex items-center gap-1 border-none cursor-pointer"
                              title="Login as user"
                            >
                              <UserCheck size={12} />
                              Login
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUserPlan(owner);
                                setNewPlanType(owner.plan || 'free');
                              }}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-bold transition border-none cursor-pointer"
                              title="Change Plan Settings"
                            >
                              Plan
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUserReset(owner);
                              }}
                              className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-[10px] font-bold transition border-none cursor-pointer"
                              title="Reset password"
                            >
                              Reset
                            </button>
                            {owner.active ? (
                              <button
                                onClick={() => handleDeactivate(owner.email)}
                                className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg border-none bg-transparent cursor-pointer"
                                title="Suspend Account"
                              >
                                <Ban size={15} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(owner.email)}
                                className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg border-none bg-transparent cursor-pointer"
                                title="Activate Account"
                              >
                                <UserCheck size={15} />
                              </button>
                            )}
                            <button
                              onClick={() => handleHardDelete(owner.email)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg border-none bg-transparent cursor-pointer"
                              title="Hard Delete Account & Data"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: Subscription configuration grid */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Layers size={24} className="text-emerald-600" />
                Subscription Plan Configurator
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Control pricing tiers, scanner token limits, staff account caps, and repository sizes.</p>
            </div>

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {Object.keys(plansConfig).map(planKey => {
                const conf = plansConfig[planKey];
                const isEditing = editingPlan === planKey;

                return (
                  <div key={planKey} className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[4rem] -z-10"></div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-extrabold uppercase border rounded px-2 py-0.5 w-max tracking-wide">
                      {planKey}
                    </span>

                    {isEditing ? (
                      <div className="space-y-3 mt-4">
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase">Monthly Price (INR)</label>
                          <input 
                            type="number" 
                            value={conf.price}
                            onChange={(e) => setPlansConfig({
                              ...plansConfig,
                              [planKey]: { ...conf, price: Number(e.target.value) }
                            })}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 text-xs rounded outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase">Staff Cap</label>
                          <input 
                            type="number" 
                            value={conf.staffLimit}
                            onChange={(e) => setPlansConfig({
                              ...plansConfig,
                              [planKey]: { ...conf, staffLimit: Number(e.target.value) }
                            })}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 text-xs rounded outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase">Product Limit</label>
                          <input 
                            type="number" 
                            value={conf.productLimit}
                            onChange={(e) => setPlansConfig({
                              ...plansConfig,
                              [planKey]: { ...conf, productLimit: Number(e.target.value) }
                            })}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 text-xs rounded outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase">Storage Limit</label>
                          <input 
                            type="text" 
                            value={conf.storageLimit}
                            onChange={(e) => setPlansConfig({
                              ...plansConfig,
                              [planKey]: { ...conf, storageLimit: e.target.value }
                            })}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 text-xs rounded outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase">Scanner Tokens</label>
                          <input 
                            type="number" 
                            value={conf.tokens}
                            onChange={(e) => setPlansConfig({
                              ...plansConfig,
                              [planKey]: { ...conf, tokens: Number(e.target.value) }
                            })}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 text-xs rounded outline-none"
                          />
                        </div>
                        <button
                          onClick={() => {
                            setEditingPlan(null);
                            showToast(`Subscription configuration saved for ${planKey.toUpperCase()}`, 'success');
                          }}
                          className="w-full py-1.5 bg-[#0f9d63] text-white rounded text-[10px] font-bold border-none cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Check size={10} />
                          Apply Configuration
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="mt-4 flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-800 font-sans">{conf.price}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">INR / month</span>
                        </div>

                        <div className="space-y-3.5 mt-6 border-t border-slate-100 pt-5 flex-1">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                            <span>Staff Account Limit</span>
                            <span className="font-mono text-slate-800 font-extrabold">{conf.staffLimit} Users</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                            <span>Product Cap limit</span>
                            <span className="font-mono text-slate-800 font-extrabold">{conf.productLimit} uploads</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                            <span>Storage Repository Limit</span>
                            <span className="font-mono text-slate-800 font-extrabold">{conf.storageLimit}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                            <span>AI Scanner tokens</span>
                            <span className="font-mono text-slate-800 font-extrabold">{conf.tokens} scans</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setEditingPlan(planKey)}
                          className="mt-6 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border-none cursor-pointer transition flex items-center justify-center gap-1.5"
                        >
                          <Edit2 size={12} />
                          Modify parameters
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 4: Staff analytics grid */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Users size={24} className="text-emerald-600" />
                Staff Analytics Portal
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Audit staff accounts generated inside the tenant system.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6">Staff Profile</th>
                      <th className="p-4">Associated Parent Tenant</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right pr-6">Created On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.filter(u => u.role === 'staff').length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-12 text-center text-slate-400 font-medium text-xs">
                          No registered staff account nodes detected.
                        </td>
                      </tr>
                    ) : (
                      users.filter(u => u.role === 'staff').map(staff => (
                        <tr key={staff.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              {staff.picture ? (
                                <img src={staff.picture} alt="Staff" className="w-8 h-8 rounded-full border shrink-0 object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0">
                                  {staff.name.charAt(0)}
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="font-extrabold text-xs text-slate-800">{staff.name}</span>
                                <span className="text-[9px] text-slate-400 font-mono">{staff.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-semibold text-slate-600 font-mono">
                            {staff.parentEmail || 'N/A'}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase border ${
                              staff.active
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                : 'bg-slate-100 border-slate-200 text-slate-500'
                            }`}>
                              {staff.active ? 'Active' : 'Offline'}
                            </span>
                          </td>
                          <td className="p-4 text-right pr-6 text-xs text-slate-500 font-mono">
                            {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: Revenue payments tables */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <CreditCard size={24} className="text-emerald-600" />
                Revenue & Payment Ledger
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Verify subscription transactions, refund invoices, and extract monthly billing details.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6">Invoice ID</th>
                      <th className="p-4">Business Owner</th>
                      <th className="p-4">Billing Plan</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-right pr-6">Refund</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-12 text-center text-slate-400 font-medium text-xs">
                          No transactions found.
                        </td>
                      </tr>
                    ) : (
                      payments.map(txn => (
                        <tr key={txn.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 pl-6 text-xs font-mono font-bold text-slate-700">{txn.invoiceId}</td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-xs text-slate-800">{txn.businessName}</span>
                              <span className="text-[9px] text-slate-400 font-mono">{txn.userId}</span>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-bold uppercase text-slate-600">{txn.plan}</td>
                          <td className="p-4 text-xs font-extrabold text-slate-800 font-mono">{txn.amount} INR</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${
                              txn.status === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                              txn.status === 'refunded' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                              'bg-rose-50 border-rose-100 text-rose-700'
                            }`}>
                              {txn.status}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-500 font-mono">
                            {new Date(txn.timestamp).toLocaleString()}
                          </td>
                          <td className="p-4 text-right pr-6">
                            {txn.status === 'success' ? (
                              <button
                                onClick={() => handleRefundTransaction(txn.id)}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] uppercase tracking-wider rounded border-none cursor-pointer transition shadow-sm shadow-amber-500/10"
                              >
                                Trigger Refund
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold italic">Settled</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 6: Support Ticketing Inbox */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Mail size={24} className="text-emerald-600" />
                Support Center Inbox
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Track customer support tickets, resolve Gemini parsing queries, and assign tasks.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6">ID & Owner</th>
                      <th className="p-4">Issue Description</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4">Assigned Admin</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-12 text-center text-slate-400 font-medium text-xs">
                          No support tickets submitted yet.
                        </td>
                      </tr>
                    ) : (
                      tickets.map(tck => (
                        <tr key={tck.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 pl-6">
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-xs text-slate-800">{tck.id}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{tck.businessName}</span>
                              <span className="text-[8px] text-slate-400 font-mono leading-none mt-0.5">{tck.userId}</span>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-semibold text-slate-700 max-w-[280px]">
                            <div className="font-bold text-slate-800 text-[11px] mb-0.5">{tck.subject}</div>
                            <div className="text-[10px] text-slate-500 font-medium line-clamp-2">{tck.description}</div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                              tck.priority === 'high' ? 'bg-red-50 border-red-100 text-red-700' :
                              tck.priority === 'medium' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                              'bg-slate-50 border-slate-200 text-slate-600'
                            }`}>
                              {tck.priority}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-mono font-semibold text-slate-500">
                            {tck.assignedAdmin || 'Unassigned'}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                              tck.status === 'open' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                              tck.status === 'in_progress' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                              'bg-emerald-50 border-emerald-100 text-emerald-700'
                            }`}>
                              {tck.status}
                            </span>
                          </td>
                          <td className="p-4 text-right pr-6 flex items-center justify-end gap-1.5">
                            {tck.status === 'open' && (
                              <button
                                onClick={() => handleAssignTicket(tck.id)}
                                className="px-2 py-1 bg-[#0f9d63] text-white rounded text-[9px] font-bold uppercase tracking-wider border-none cursor-pointer hover:bg-emerald-700 transition"
                              >
                                Assign
                              </button>
                            )}
                            {tck.status !== 'resolved' && (
                              <button
                                onClick={() => handleResolveTicket(tck.id)}
                                className="px-2 py-1 bg-emerald-600 text-white rounded text-[9px] font-bold uppercase tracking-wider border-none cursor-pointer hover:bg-emerald-700 transition"
                              >
                                Resolve
                              </button>
                            )}
                            {tck.status === 'resolved' && (
                              <span className="text-[10px] font-bold text-slate-400">Done</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 7: System Monitoring Indicators */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Cpu size={24} className="text-emerald-600" />
                System Health & Database Sizes
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Realtime monitoring of CPU, runtime environment, and JSON database volumes.</p>
            </div>

            {systemMetrics ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Database Sizes */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={16} className="text-emerald-600" />
                    Database File Size Indicators
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {Object.keys(systemMetrics.dbSizes).map(key => (
                      <div key={key} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{key}</span>
                          <span className="font-mono text-xs font-bold text-slate-700 mt-0.5">
                            {key === 'users' ? 'users.json' :
                             key === 'database' ? 'database.json' :
                             key === 'bills' ? 'bills.json' :
                             key === 'scanHistory' ? 'scan_history.json' :
                             `${key}.json`}
                          </span>
                        </div>
                        <span className="font-mono text-sm font-black text-slate-800">
                          {(systemMetrics.dbSizes[key] / 1024).toFixed(2)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Node Environment info */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity size={16} className="text-emerald-600" />
                      Server Status
                    </h3>
                    
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                        <span>Runtime Uptime</span>
                        <span className="font-mono text-slate-800 font-extrabold">{(systemMetrics.uptime / 3600).toFixed(2)} hours</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                        <span>Node Version</span>
                        <span className="font-mono text-slate-800 font-extrabold">{systemMetrics.nodeVersion}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                        <span>Memory RSS</span>
                        <span className="font-mono text-slate-800 font-extrabold">{(systemMetrics.memory.rss / (1024 * 1024)).toFixed(1)} MB</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                        <span>Heap Used</span>
                        <span className="font-mono text-slate-800 font-extrabold">{(systemMetrics.memory.heapUsed / (1024 * 1024)).toFixed(1)} MB</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-xl p-4 text-slate-400 space-y-2 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-white font-bold">
                      <CheckCircle2 className="text-emerald-500" size={14} />
                      API Core Online
                    </div>
                    <p className="text-[9px] leading-relaxed text-slate-500">
                      Standard REST controllers routing calls directly to system disk files successfully.
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 font-semibold bg-white rounded-2xl border border-slate-200">
                Fetching metrics from node runtime...
              </div>
            )}
          </div>
        )}

        {/* VIEW 8: Activity logs audit */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Activity size={24} className="text-emerald-600" />
                Audit Trail & Logs
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Verify system operations, administrator logins, deactivations, and client requests.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6">ID & Date</th>
                      <th className="p-4">User Scope</th>
                      <th className="p-4">Action Detail</th>
                      <th className="p-4">Client IP</th>
                      <th className="p-4 text-right pr-6">System device</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activityLogs.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-12 text-center text-slate-400 font-medium text-xs">
                          No audit trails written to logs database yet.
                        </td>
                      </tr>
                    ) : (
                      activityLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 pl-6">
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-xs text-slate-800">{log.id}</span>
                              <span className="text-[9px] text-slate-400 font-mono mt-0.5">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-slate-800">{log.userName}</span>
                              <span className="text-[9px] text-slate-400 font-mono">{log.userId} ({log.role})</span>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-semibold text-slate-700">{log.action}</td>
                          <td className="p-4 text-xs font-mono font-bold text-slate-500">{log.ip}</td>
                          <td className="p-4 text-right pr-6 text-xs text-slate-400">{log.device}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 9: Announcement Broadcast Center */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Bell size={24} className="text-emerald-600" />
                Notification Broadcast Center
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Broadcast push announcements or instructions to users matching specific license tiers.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
              <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Target License Group</label>
                  <select
                    value={announcement.target}
                    onChange={(e) => setAnnouncement({ ...announcement, target: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-semibold text-slate-700"
                  >
                    <option value="all">All Registered Accounts</option>
                    <option value="free">Free Tiers Only</option>
                    <option value="basic">Basic Tiers Only</option>
                    <option value="pro">Pro Tiers Only</option>
                    <option value="enterprise">Enterprise Tiers Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Announcement Title</label>
                  <input
                    type="text"
                    required
                    value={announcement.title}
                    onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                    placeholder="Enter short headline (e.g. Server Upgrade)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Announcement Message</label>
                  <textarea
                    required
                    rows="4"
                    value={announcement.message}
                    onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                    placeholder="Write detailed notification instructions..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-semibold"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#0f9d63] hover:bg-emerald-700 text-white font-bold rounded-xl transition border-none cursor-pointer text-xs uppercase tracking-wider shadow-sm shadow-indigo-600/15 flex items-center justify-center gap-1.5"
                >
                  <ArrowUpRight size={14} />
                  Publish Broadcast
                </button>
              </form>
            </div>
          </div>
        )}

        {/* VIEW 10: Settings & RBAC role Assignment */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <KeyRound size={24} className="text-emerald-600" />
                Settings & Privileges
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Control administrative console access and configure RBAC roles.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Reset Password Form */}
              <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4 h-fit">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <KeyRound className="text-amber-500" size={18} />
                    Update Password
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Modify console master password.</p>
                </div>

                <form onSubmit={handleChangeConsolePassword} className="space-y-4">
                  <div>
                    <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Old Credentials</label>
                    <PasswordInput
                      value={oldPass}
                      onChange={e => setOldPass(e.target.value)}
                      placeholder="Current password"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">New password</label>
                    <PasswordInput
                      value={newPass}
                      onChange={e => setNewPass(e.target.value)}
                      placeholder="Min 4 characters"
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full py-2.5 bg-[#0f9d63] hover:bg-emerald-700 text-white font-bold rounded-xl transition border-none cursor-pointer text-xs uppercase"
                  >
                    Submit
                  </button>
                </form>
              </div>

              {/* RBAC Sub-admins roster */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <UserCog className="text-emerald-600" size={18} />
                    Sub-admin Roles Configuration
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Test security scoping permissions using seeded credentials.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-slate-800">Super Admin (SYS-ROOT)</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">admin@inventoryant.com / admin123</span>
                    </div>
                    <span className="text-[9px] bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded font-bold uppercase">
                      Full Privileges
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-slate-800">Support Admin (SUPPORT-OFFICER)</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">support@inventoryant.com / admin123</span>
                    </div>
                    <span className="text-[9px] bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold uppercase">
                      Tickets & Users only
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-slate-800">Finance Admin (REVENUE-AUDITOR)</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">finance@inventoryant.com / admin123</span>
                    </div>
                    <span className="text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold uppercase">
                      Billing & Subs only
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-slate-800">Technical Admin (SYSTEM-ENGINEER)</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">tech@inventoryant.com / admin123</span>
                    </div>
                    <span className="text-[9px] bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-bold uppercase">
                      Console, Logs & Health
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: Business Details Drawer Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn">
            <div className="p-5 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <Info className="text-emerald-600" size={18} />
                Detailed Business Parameters
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full border-none bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-[#0f9d63] text-white font-black flex items-center justify-center uppercase">
                  {selectedUser.name.substring(0, 2)}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 m-0">{selectedUser.businessName || 'N/A'}</h3>
                  <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                    {selectedUser.plan || 'free'}
                  </span>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-start gap-2">
                  <User size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Owner Name</div>
                    <div className="text-xs text-slate-700 font-bold mt-0.5">{selectedUser.name}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Mail size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Email Address</div>
                    <div className="text-xs text-slate-700 font-bold font-mono mt-0.5">{selectedUser.email}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Building size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Business Type</div>
                    <div className="text-xs text-slate-700 font-bold mt-0.5">{selectedUser.businessType || 'Not Specified'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Business Address</div>
                    <div className="text-xs text-slate-700 font-bold mt-0.5">{selectedUser.businessAddress || 'Not Set'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Date Onboarded</div>
                    <div className="text-xs text-slate-700 font-bold mt-0.5">
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Roster list of staff inside detailed view */}
              <div className="border-t border-slate-100 pt-4 mt-3">
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users size={12} className="text-emerald-500" />
                  Associated Staff ({users.filter(u => u.role === 'staff' && u.parentEmail?.toLowerCase() === selectedUser.email.toLowerCase()).length})
                </div>
                {(() => {
                  const staffList = users.filter(u => u.role === 'staff' && u.parentEmail?.toLowerCase() === selectedUser.email.toLowerCase());
                  return staffList.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No staff members created yet.</span>
                  ) : (
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {staffList.map(st => (
                        <div key={st.id} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100 text-xs">
                          <span className="font-semibold text-slate-700">{st.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{st.email}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold cursor-pointer text-slate-600 hover:bg-slate-50 transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Change License Plan popup */}
      {selectedUserPlan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-scaleIn">
            <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">Adjust Account plan: {selectedUserPlan.email}</h2>
              <button onClick={() => setSelectedUserPlan(null)} className="p-1 border-none bg-transparent cursor-pointer text-slate-400">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePlanUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Target Plan Tier</label>
                <select
                  value={newPlanType}
                  onChange={(e) => setNewPlanType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                >
                  <option value="free">Free Plan</option>
                  <option value="basic">Basic Plan</option>
                  <option value="pro">Pro Plan</option>
                  <option value="enterprise">Enterprise Plan</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Validity Extension (Days)</label>
                <input
                  type="number"
                  required
                  value={newPlanValidity}
                  onChange={(e) => setNewPlanValidity(Number(e.target.value))}
                  placeholder="30"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#0f9d63] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer transition"
                >
                  Save settings
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserPlan(null)}
                  className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Reset user password popup */}
      {selectedUserReset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-scaleIn">
            <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">Reset Password: {selectedUserReset.email}</h2>
              <button onClick={() => setSelectedUserReset(null)} className="p-1 border-none bg-transparent cursor-pointer text-slate-400">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePasswordReset} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">New User Password</label>
                <input
                  type="text"
                  required
                  value={resetPassVal}
                  onChange={(e) => setResetPassVal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#0f9d63] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer transition"
                >
                  Apply Change
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserReset(null)}
                  className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {adminConfirm.isOpen && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left">
            <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
              <ShieldAlert className="text-red-500" size={18} /> {adminConfirm.title}
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">
              {adminConfirm.message}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setAdminConfirm({ isOpen: false, title: '', message: '', onConfirm: null })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const onConf = adminConfirm.onConfirm;
                  setAdminConfirm({ isOpen: false, title: '', message: '', onConfirm: null });
                  if (onConf) onConf();
                }}
                className="px-4 py-2 bg-[#EF4444] hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
