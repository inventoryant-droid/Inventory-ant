import React, { useState } from 'react';
import '../../App.css';
import { LayoutDashboard, TerminalSquare, Receipt, Package, Scan, Settings, BookOpen, Info, ArrowLeftRight, Sun, Moon, LogOut, Menu, X, Shield, Users, Tag } from 'lucide-react';

function Sidebar({ setView, view, userId, userRole, onLogout, onSwitchAccount, setInventoryFilter, theme, onToggleTheme, userProfile }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    ...(userRole === 'user' ? [
      { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
      { id: 'ant_x', label: 'Ant X Terminal', icon: <TerminalSquare size={18} /> },
      { id: 'billing', label: 'Billing', icon: <Receipt size={18} /> },
      { id: 'inventory', label: 'Master Inventory', icon: <Package size={18} /> },
      { id: 'ai_lab', label: 'Smart Scanner', icon: <Scan size={18} /> },
      { id: 'staff_management', label: 'Staff Management', icon: <Users size={18} /> },
    ] : []),
    ...(userRole === 'staff' ? [
      { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
      { id: 'ant_x', label: 'Ant X Terminal', icon: <TerminalSquare size={18} /> },
      { id: 'billing', label: 'Billing', icon: <Receipt size={18} /> },
      { id: 'inventory', label: 'Master Inventory', icon: <Package size={18} /> },
      { id: 'ai_lab', label: 'Smart Scanner', icon: <Scan size={18} /> },
    ] : []),
    ...(userRole === 'admin' ? [{ id: 'admin_panel', label: 'Admin Panel', icon: <Shield size={18} /> }] : []),
    ...(userRole !== 'staff' ? [
      { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
      { id: 'guide', label: 'User Guide', icon: <BookOpen size={18} /> },
      { id: 'about', label: 'About Us', icon: <Info size={18} /> },
    ] : []),
  ];

  const handleNavClick = (id) => {
    if (id === 'inventory') {
      setInventoryFilter('all');
    }
    setView(id);
    setIsMobileOpen(false); // Close menu on mobile after click
  };

  return (
    <>
      {/* Mobile Top Header (Visible only on small screens) */}
      <div className="md:hidden w-full sticky top-0 bg-white border-b border-slate-200 z-50 p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="text-2xl grayscale brightness-150 drop-shadow-sm">🐜</div> 
          <span className="tracking-widest font-black text-indigo-900 text-lg leading-none">INVENTORY ANT</span>
        </div>
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)} 
          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border-none cursor-pointer transition-colors"
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Main Sidebar (Off-canvas on mobile, fixed/sticky on desktop) */}
      <div className={`
        fixed md:sticky top-[73px] md:top-0 left-0 w-full md:w-[260px] h-[calc(100vh-73px)] md:h-screen 
        bg-white md:border-r border-slate-200 z-40 
        flex flex-col p-5 overflow-y-auto transition-transform duration-300 ease-in-out shadow-2xl md:shadow-sm
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Desktop Logo (Hidden on mobile) */}
        <div className="hidden md:flex items-center gap-3 shrink-0 mb-6">
          <div className="text-3xl grayscale brightness-150 drop-shadow-sm">🐜</div> 
          <div className="flex flex-col">
            <span className="tracking-widest font-black text-indigo-900 text-base leading-none">INVENTORY ANT</span>
            <span className="text-[8px] tracking-widest text-slate-400 font-bold uppercase mt-1">B2B Warehouse Intelligence</span>
          </div>
        </div>
        
        {/* User Profile Badge */}
        <div 
          onClick={() => {
            if (userRole !== 'admin' && userRole !== 'staff') {
              setView('profile');
            }
          }}
          className={`bg-slate-50 p-4 rounded-2xl border border-slate-100 shrink-0 flex items-center gap-3 shadow-sm relative mb-6
            ${(userRole !== 'admin' && userRole !== 'staff') ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''}
          `}
          title={(userRole !== 'admin' && userRole !== 'staff') ? "Edit Business Profile" : ""}
        >
           {userRole === 'admin' ? (
             <div className="w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm border shrink-0 bg-indigo-600 text-white border-indigo-700">
               <Shield size={18} />
             </div>
           ) : (
             userProfile?.businessLogo ? (
               <img src={userProfile.businessLogo} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
             ) : (
               <div className="w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm border shrink-0 bg-indigo-100 text-indigo-700 border-indigo-200">
                 {userId ? userId.substring(0,2).toUpperCase() : 'U'}
               </div>
             )
           )}
           <div className="flex flex-col overflow-hidden">
              <div className="text-sm font-bold text-slate-800 overflow-hidden text-ellipsis whitespace-nowrap">
                {userRole === 'admin' ? 'ADMINISTRATOR' : (userProfile?.businessName || userProfile?.name || userId)}
              </div>
              <div className="text-[9px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                {userRole === 'admin' ? 'ID: SYS-ROOT' : (userRole === 'staff' ? 'Role: Staff' : 'Edit Profile ➔')}
              </div>
           </div>
           <div className="absolute bottom-3 right-4 w-2 h-2 rounded-full bg-emerald-500 border border-white"></div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5 shrink-0 flex-1">
          {navItems.map(item => {
            const isActive = view === item.id;
            return (
            <button 
              key={item.id}
              onClick={() => handleNavClick(item.id)} 
              className={`text-left border-none py-3 px-4 flex items-center gap-3 rounded-r-full text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap
                ${isActive ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 pl-3' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-l-4 border-transparent pl-3 bg-transparent'}
              `}
            >
              <span className={isActive ? "text-indigo-600" : "text-slate-400"}>{item.icon}</span>
              <span className="inline">{item.label}</span>
            </button>
          )})}
        </nav>

         {/* Bottom Action Buttons */}
         <div className="mt-8 md:mt-auto flex flex-col gap-2 shrink-0 pb-4 md:pb-0">
           <button onClick={onSwitchAccount} className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-indigo-600 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer">
             <ArrowLeftRight size={14} />
             <span className="inline">Switch Workspace</span>
           </button>
           <button 
             onClick={onToggleTheme} 
             className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-sm
               ${theme === 'dark' 
                 ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' 
                 : 'bg-[#E0E7FF]/60 hover:bg-[#E0E7FF]/90 text-indigo-700'
               }`}
           >
              {theme === 'dark' ? <Sun size={14}/> : <Moon size={14}/>}
              <span className="inline">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
           </button>
           <button 
             onClick={onLogout} 
             className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none shadow-sm
               ${theme === 'dark' 
                 ? 'bg-red-950/40 hover:bg-red-950/60 text-red-400' 
                 : 'bg-red-50 hover:bg-red-100/90 text-red-600'
               }`}
           >
             <LogOut size={14} />
             <span className="inline">Logout</span>
           </button>
         </div>
       </div>
    </>
  );
}

export default Sidebar;
