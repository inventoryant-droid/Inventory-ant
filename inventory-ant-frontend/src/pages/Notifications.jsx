import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NotificationService } from '../services/notificationService';
import { 
  Bell, CheckSquare, Search, RefreshCw, AlertTriangle, 
  Mail, Calendar, ArrowRight, Shield, Tag, Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import '../App.css';

export default function Notifications() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread'
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(10); // Infinite scroll simulator

  // 1. FETCH NOTIFICATIONS
  const { data: notificationsData, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: NotificationService.getNotifications,
    staleTime: 15000,
  });

  // Local state for read tracking
  const readNotificationIds = useMemo(() => {
    try {
      const stored = localStorage.getItem('ant_read_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }, [notificationsData]);

  // Check if a notification is unread
  const isUnread = (id) => !readNotificationIds.includes(id);

  // Mark all as read
  const handleMarkAllRead = () => {
    if (!notificationsData) return;
    const allIds = notificationsData.map(n => n.id);
    localStorage.setItem('ant_read_notifications', JSON.stringify(allIds));
    // Trigger local refresh by invalidating query cache
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    toast.success('All announcements marked as read');
  };

  // Mark single as read
  const handleMarkSingleRead = (id) => {
    if (readNotificationIds.includes(id)) return;
    const updated = [...readNotificationIds, id];
    localStorage.setItem('ant_read_notifications', JSON.stringify(updated));
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  // Filtered and searched notifications
  const filteredNotifications = useMemo(() => {
    if (!notificationsData) return [];
    
    return notificationsData
      .filter(n => {
        // Search filter
        const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              n.message.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Type filter
        if (filterType === 'unread') {
          return matchesSearch && isUnread(n.id);
        }
        return matchesSearch;
      });
  }, [notificationsData, filterType, searchQuery, readNotificationIds]);

  // Group notifications by date (Today, Yesterday, Older)
  const groupedNotifications = useMemo(() => {
    const groups = {
      Today: [],
      Yesterday: [],
      Older: []
    };

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    filteredNotifications.slice(0, visibleCount).forEach(item => {
      const date = new Date(item.createdAt);
      if (date.toDateString() === today.toDateString()) {
        groups.Today.push(item);
      } else if (date.toDateString() === yesterday.toDateString()) {
        groups.Yesterday.push(item);
      } else {
        groups.Older.push(item);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [filteredNotifications, visibleCount]);

  const unreadCount = useMemo(() => {
    if (!notificationsData) return 0;
    return notificationsData.filter(n => isUnread(n.id)).length;
  }, [notificationsData, readNotificationIds]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 flex-1 overflow-y-auto space-y-6 animate-pulse bg-[#F8FAFC]">
        <div className="h-10 bg-slate-200 rounded-lg w-48 text-left" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white border border-slate-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] text-center min-h-[500px]">
        <AlertTriangle size={48} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Failed to load notifications</h2>
        <p className="text-slate-500 text-sm mt-2">Could not retrieve system announcements.</p>
        <button 
          onClick={() => refetch()}
          className="mt-6 py-2.5 px-6 bg-[#0f9d63] hover:bg-emerald-700 text-white rounded-xl text-sm font-bold border-none cursor-pointer flex items-center gap-2"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC] space-y-6 text-left">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-emerald-600 flex items-center gap-2">
            Notification Center
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1 m-0">
            System announcements, billing reminders and warehouse alerts.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllRead}
              className="py-2 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 hover:border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckSquare size={14} /> Mark all read
            </button>
          )}
          <button 
            onClick={() => refetch()}
            className="p-2 hover:bg-slate-100 rounded-xl border border-slate-200 bg-white text-slate-500 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        
        {/* Search bar */}
        <div className="relative md:col-span-2">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search announcement content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none"
          />
        </div>

        {/* Filter Tab buttons */}
        <div className="flex gap-2">
          {['all', 'unread'].map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterType(filter)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                filterType === filter 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {filter === 'all' ? 'All Alerts' : 'Unread'}
            </button>
          ))}
        </div>

      </div>

      {/* GROUPED LIST */}
      <div className="space-y-8">
        {groupedNotifications.map(([groupName, items]) => (
          <div key={groupName} className="space-y-4">
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block border-b border-slate-100 pb-1.5 pl-2">
              {groupName}
            </span>
            
            <div className="space-y-3">
              {items.map((item) => {
                const isItemUnread = isUnread(item.id);
                // Dynamically color badges based on category keywords
                const isBilling = item.title.toLowerCase().includes('invoice') || item.title.toLowerCase().includes('renew') || item.title.toLowerCase().includes('payment') || item.title.toLowerCase().includes('billing');
                const isSecurity = item.title.toLowerCase().includes('security') || item.title.toLowerCase().includes('authorized') || item.title.toLowerCase().includes('session') || item.title.toLowerCase().includes('staff');
                
                return (
                  <div 
                    key={item.id}
                    onClick={() => handleMarkSingleRead(item.id)}
                    className={`bg-white border rounded-2xl p-4 flex gap-4 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.01)] ${
                      isItemUnread 
                        ? 'border-emerald-200 ring-2 ring-emerald-500/5 cursor-pointer hover:border-emerald-300' 
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {/* Icon Column */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isBilling 
                        ? 'bg-amber-50 text-amber-600' 
                        : isSecurity 
                          ? 'bg-rose-50 text-rose-500' 
                          : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {isBilling ? <Tag size={18} /> : isSecurity ? <Shield size={18} /> : <Bell size={18} />}
                    </div>

                    {/* Content Column */}
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start gap-4">
                        <h4 className="m-0 text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          {item.title}
                          {isItemUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                          )}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="m-0 text-xs text-slate-500 leading-relaxed font-sans">{item.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* INFINITE SCROLL SIMULATION */}
        {filteredNotifications.length > visibleCount && (
          <div className="text-center pt-4">
            <button 
              onClick={() => setVisibleCount(prev => prev + 10)}
              className="py-2.5 px-6 bg-white hover:bg-slate-50 text-emerald-600 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center gap-1"
            >
              Load More Announcements <ArrowRight size={14} />
            </button>
          </div>
        )}

        {filteredNotifications.length === 0 && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center text-slate-400 text-xs sm:text-sm font-medium shadow-sm space-y-3">
            <Mail className="mx-auto text-slate-300" size={32} />
            <p className="m-0">No notifications match your current filter selection.</p>
          </div>
        )}
      </div>

    </div>
  );
}
