import React from 'react';
import Sidebar from './Sidebar';

export default function DashboardLayout({
  children,
  view,
  setView,
  userId,
  userRole,
  onLogout,
  onSwitchAccount,
  setInventoryFilter,
  theme,
  onToggleTheme,
  userProfile
}) {
  const impersonating = !!localStorage.getItem('ant_admin_token');

  return (
    <div className={`${theme === 'dark' ? 'dark-theme ' : 'light-theme '} flex flex-col w-full h-screen overflow-hidden bg-slate-50`}>
      {/* Impersonation Banner */}
      {impersonating && (
        <div className="w-full bg-[#EF4444] text-white text-center py-3 px-6 flex flex-row items-center justify-between z-50 font-sans shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <span className="animate-pulse inline-block w-2.5 h-2.5 rounded-full bg-white"></span>
            <span>Impersonation Mode: Logged in as <strong>{userId}</strong></span>
          </div>
          <button 
            onClick={() => {
              const adminToken = localStorage.getItem('ant_admin_token');
              const adminUser = localStorage.getItem('ant_admin_user');
              const adminRole = localStorage.getItem('ant_admin_role');
              
              localStorage.setItem('ant_token', adminToken);
              localStorage.setItem('ant_user', adminUser);
              localStorage.setItem('ant_role', adminRole);
              
              localStorage.removeItem('ant_admin_token');
              localStorage.removeItem('ant_admin_user');
              localStorage.removeItem('ant_admin_role');
              
              window.location.href = '/admin';
            }}
            className="bg-white text-[#EF4444] hover:bg-[#FEE2E2] font-semibold px-4 py-1.5 rounded-lg text-sm transition-all duration-200 shadow-sm border-none cursor-pointer"
          >
            Exit & Return to Admin
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-col md:flex-row w-full flex-1 min-h-0 overflow-hidden">
        <Sidebar 
          setView={setView} 
          view={view} 
          userId={userId} 
          userRole={userRole} 
          onLogout={onLogout} 
          onSwitchAccount={onSwitchAccount} 
          setInventoryFilter={setInventoryFilter} 
          theme={theme} 
          onToggleTheme={onToggleTheme} 
          userProfile={userProfile}
        />
        
        {/* Child Pages Content */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col bg-[#F8FAFC]">
          {children}
        </div>
      </div>
    </div>
  );
}
