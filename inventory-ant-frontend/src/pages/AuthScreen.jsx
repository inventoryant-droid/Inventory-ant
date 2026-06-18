import React, { useState } from 'react';
import '../App.css';
import AntSupplyChain from '../components/ui/AntSupplyChain';

function AuthScreen({ onLogin }) {
  const [shopName, setShopName] = useState('');
  const savedId = localStorage.getItem('ant_user');

  const submit = (e) => {
     e.preventDefault();
     if(shopName.trim()) onLogin(shopName);
  }

  return (
    <div className="w-screen h-screen flex flex-col md:flex-row bg-[var(--bg-dark)] overflow-hidden m-0 p-0">
      {/* Left Side: AI Animation Engine (Hidden on mobile) */}
      <div className="hidden md:flex flex-1 bg-[radial-gradient(circle_at_center,var(--sidebar-bg)_0%,var(--bg-dark)_100%)] relative items-center justify-center border-r border-[var(--glass-border)]">
        <div className="absolute top-10 left-10 z-10">
           <h2 className="text-blue-500/50 text-[10px] tracking-[4px] uppercase m-0 font-bold">Neural Core v4.0</h2>
           <div className="text-[var(--text-main)] text-lg font-bold mt-2">AI_SUPPLY_CHAIN_ACTIVE</div>
        </div>
        
        <div className="w-[90%] h-[80%]">
           <AntSupplyChain />
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-10 left-10 text-[var(--text-muted)] text-[10px] font-mono leading-relaxed">
           SYSTEM_SYNC: OK <br/>
           MEMORY_INDEX: 0x9AF2 <br/>
           ANT_X_READY: TRUE
        </div>
      </div>

      {/* Right Side: Login Card */}
      <div className="w-full md:w-[450px] flex-1 md:flex-none flex items-center justify-center relative bg-black/60 md:bg-black p-6">
        <div className="glass-panel w-full max-w-md p-8 md:p-10 text-center border border-blue-500/20 shadow-2xl">
            <div className="mb-10">
               <div className="text-6xl mb-5 animate-pulse">🐜</div>
               <h2 className="text-blue-500/70 text-xs font-bold tracking-[4px] uppercase mb-2">System Access</h2>
               <h1 className="m-0 text-4xl font-extrabold text-[var(--danger)] tracking-tight">
                 Inventory <span className="text-[var(--danger)]">Ant</span>
               </h1>
               <p className="text-[var(--text-muted)] mt-3 text-sm leading-relaxed">
                  Secure terminal for autonomous <br/> warehouse management.
               </p>
            </div>
            
            {savedId && (
              <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 mb-6 text-left flex items-center justify-between">
                <div>
                  <div className="text-[10px] color-[var(--text-muted)] uppercase tracking-wider mb-1">Authorized Node</div>
                  <div className="font-bold text-blue-400 text-base font-mono">{savedId}</div>
                </div>
                <button 
                  onClick={() => onLogin(savedId)} 
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-[var(--text-main)] rounded-lg transition-colors border-none cursor-pointer"
                >Resume</button>
              </div>
            )}

            <form onSubmit={submit} className="flex flex-col gap-5">
               <input 
                  autoFocus 
                  type="text" 
                  placeholder="Enter Workspace ID" 
                  value={shopName} 
                  onChange={e=>setShopName(e.target.value)} 
                  className="w-full p-4 bg-white/5 text-[var(--text-main)] border border-blue-500/10 focus:border-blue-500/40 rounded-xl text-base text-center outline-none transition-colors"
               />
               <button 
                 type="submit" 
                 className="w-full py-4 text-base font-bold bg-blue-600 hover:bg-blue-700 text-[var(--text-main)] rounded-xl transition-colors border-none cursor-pointer"
               >
                 Login
               </button>
            </form>
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;
