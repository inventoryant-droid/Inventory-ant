import React, { useState, useEffect, useRef, useMemo } from 'react';
import '../../App.css';

function Sidebar({ setView, view, userId, onLogout, onSwitchAccount, setInventoryFilter, theme, onToggleTheme }) {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: '📊' },
    { id: 'ant_x', label: 'Ant X Terminal', icon: '🐜' },
    { id: 'billing', label: 'Billing', icon: '🛒' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'ai_lab', label: 'Smart Scanner', icon: '🤖' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'guide', label: 'User Guide', icon: '📖' },
    { id: 'about', label: 'About Us', icon: 'ℹ️' },
  ];

  return (
    <div className="glass-panel w-full md:w-[280px] h-auto md:h-[calc(100vh-2rem)] m-0 md:m-4 p-4 md:p-7 flex flex-row md:flex-col gap-4 md:gap-7 sticky top-0 md:top-4 overflow-x-auto md:overflow-y-auto transition-all duration-300 bg-[var(--sidebar-bg)] border border-[var(--glass-border)] z-40 items-center md:items-stretch">
      <h2 className="m-0 text-xl md:text-2xl flex items-center gap-2 md:gap-3 shrink-0">
        <span className="text-2xl md:text-3xl">🐜</span> 
        <span className="tracking-widest font-black gradient-text hidden md:inline">INVENTORY ANT</span>
      </h2>
      
      <div className="bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--glass-border)] shrink-0 hidden md:block shadow-sm">
         <div className="text-[0.6rem] text-[var(--text-muted)] uppercase tracking-[1.5px] mb-1">User ID</div>
         <div className="text-[var(--primary)] font-bold text-lg overflow-hidden text-ellipsis">{userId}</div>
      </div>

      <nav className="flex flex-row md:flex-col gap-2 shrink-0">
        {navItems.map(item => (
          <button 
            key={item.id}
            onClick={() => {
              if (item.id === 'inventory') {
                setInventoryFilter('all');
              }
              setView(item.id);
            }} 
            className={`text-left border-none p-3 md:px-5 md:py-3.5 flex items-center gap-2 md:gap-4 rounded-xl text-sm transition-all duration-200 cursor-pointer whitespace-nowrap
              ${view === item.id ? 'font-bold bg-[var(--primary)] text-white shadow-md' : 'font-medium text-[var(--text-main)] hover:bg-[var(--primary-bg)]'}
            `}
            style={{ 
              background: view === item.id ? 'var(--primary)' : 'transparent', 
              color: view === item.id ? '#ffffff' : 'var(--text-main)',
              opacity: view === item.id ? 1 : 0.8,
            }}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="hidden md:inline">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-0 md:mt-auto flex flex-row md:flex-col gap-2 md:gap-3 pb-0 md:pb-4 shrink-0">
        <button onClick={onSwitchAccount} className="btn-primary text-[0.7rem] whitespace-nowrap py-2.5">
          <span className="hidden md:inline">🔄 Switch Workspace</span>
          <span className="md:hidden">🔄</span>
        </button>
        <button onClick={onToggleTheme} className="btn-outline text-[0.7rem] whitespace-nowrap py-2.5">
           <span className="hidden md:inline">{theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
           <span className="md:hidden">{theme === 'dark' ? '☀️' : '🌙'}</span>
        </button>
        <button onClick={onLogout} className="btn-danger text-[0.7rem] whitespace-nowrap py-2.5">
          <span className="hidden md:inline">Logout</span>
          <span className="md:hidden">🚪</span>
        </button>
      </div>
    </div>
  );
}


export default Sidebar;
