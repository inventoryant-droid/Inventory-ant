import React, { useState } from 'react';
import '../App.css';

function AuthScreen({ onLogin }) {
  const [shopName, setShopName] = useState('');
  const [password, setPassword] = useState(''); // Just for UI, does not affect functionality
  const savedId = localStorage.getItem('ant_user');

  const submit = (e) => {
     e.preventDefault();
     if(shopName.trim()) onLogin(shopName);
  }

  return (
    <div className="w-screen h-screen flex flex-col md:flex-row bg-white overflow-hidden m-0 p-0">
      {/* Left Side: Gradient Hero */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 relative items-center justify-center flex-col text-white">
        <div className="flex flex-col items-center justify-center -mt-20">
           <div className="text-8xl mb-6 drop-shadow-2xl grayscale brightness-150">🐜</div>
           <h1 className="m-0 text-5xl font-extrabold tracking-tight mb-3">
             Inventory Ant
           </h1>
           <p className="text-white/90 text-lg font-medium tracking-wide">
              B2B Warehouse Intelligence
           </p>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-10 text-white/50 text-[10px] font-mono leading-relaxed text-center uppercase tracking-widest">
           SYSTEM_SYNC: OK <br/>
           ANT_X_READY: TRUE
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full md:w-[500px] flex-1 md:flex-none flex items-center justify-center relative bg-white p-8">
        <div className="w-full max-w-md text-center">
            <div className="mb-8">
               <h2 className="text-indigo-500 text-[10px] font-bold tracking-[4px] uppercase mb-3">System Access</h2>
               <h1 className="m-0 text-3xl font-extrabold text-slate-800 tracking-tight mb-2">
                 Inventory <span className="text-indigo-600">Ant</span>
               </h1>
               <p className="text-slate-500 mt-3 text-sm">
                  Secure terminal for autonomous warehouse management.
               </p>
            </div>
            
            {savedId && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 text-left flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-indigo-400 uppercase tracking-wider mb-1 font-bold">Authorized Node</div>
                  <div className="font-bold text-indigo-700 text-sm font-mono">{savedId}</div>
                </div>
                <button 
                  onClick={() => onLogin(savedId)} 
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors border-none cursor-pointer shadow-sm"
                >Resume</button>
              </div>
            )}

            {/* Toggle Tabs */}
            <div className="flex mb-8 bg-slate-50 p-1 rounded-xl border border-slate-100">
                <button className="flex-1 py-2.5 text-sm font-bold bg-white text-indigo-600 rounded-lg shadow-sm border border-slate-100 cursor-pointer">Sign In</button>
                <button className="flex-1 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 rounded-lg bg-transparent border-none cursor-pointer transition-colors">Sign Up</button>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4 text-left">
               <input 
                  autoFocus 
                  type="text" 
                  placeholder="Email Address" 
                  value={shopName} 
                  onChange={e=>setShopName(e.target.value)} 
                  className="w-full p-3.5 bg-white text-slate-800 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm outline-none transition-all"
                  required
               />
               <input 
                  type="password" 
                  placeholder="Password" 
                  value={password} 
                  onChange={e=>setPassword(e.target.value)} 
                  className="w-full p-3.5 bg-white text-slate-800 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm outline-none transition-all"
               />
               
               <button 
                 type="submit" 
                 className="w-full py-3.5 mt-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg border-none cursor-pointer"
               >
                 Login to Terminal
               </button>

               <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-slate-200"></div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">OR</span>
                  <div className="flex-1 h-px bg-slate-200"></div>
               </div>

               <button 
                 type="button" 
                 className="w-full py-3.5 text-sm font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer"
               >
                 <span className="text-lg font-bold" style={{ color: '#EA4335' }}>G</span> Continue with Google
               </button>
            </form>
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;
