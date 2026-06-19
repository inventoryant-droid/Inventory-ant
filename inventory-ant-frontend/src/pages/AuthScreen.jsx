import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Mail, Lock, Phone, User, ArrowRight, Eye, EyeOff, CheckCircle2, ShieldCheck, RefreshCw, ShieldAlert, Cpu, Sparkles } from 'lucide-react';
import '../App.css';

function AuthScreen({ onLogin }) {
  const [view, setView] = useState('landing'); // 'landing', 'login', 'otp', 'signup', 'admin'

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState(['', '', '', '', '', '']);
  const [toast, setToast] = useState({ show: false, message: '' });

  const savedId = localStorage.getItem('ant_user');

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (view === 'signup') {
      if (password !== confirmPassword) {
        alert('Passwords do not match. Please try again.');
        return;
      }
      
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      setToast({ show: true, message: `OTP sent successfully to mobile! (Default Code: ${otp})` });
      
      setTimeout(() => setToast({ show: false, message: '' }), 5000);
      
      setView('verify-otp');
    } else if (view === 'login') {
      try {
        const res = await fetch('http://localhost:3000/users/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.email) {
          onLogin(data.email, data.role || 'user');
        } else {
          alert(data.message || 'Invalid credentials');
        }
      } catch (err) {
        alert('Network error');
      }
    } else if (view === 'otp') {
      // Mock OTP request
      alert(`OTP sent to ${mobile}! (Mocked)`);
    }
  };

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;
    const newOtp = [...enteredOtp];
    newOtp[index] = element.value;
    setEnteredOtp(newOtp);

    if (element.nextSibling && element.value) {
      element.nextSibling.focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const code = enteredOtp.join('');
    if (code !== generatedOtp) {
      alert('Invalid OTP. Please try again.');
      return;
    }
    
    try {
      const res = await fetch('http://localhost:3000/users/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone: mobile }) 
      });
      const data = await res.json();
      if (data.email) {
        onLogin(data.email, 'user');
      } else {
        alert(data.message || 'Signup failed');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/users/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password })
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.userId, data.role);
      } else {
        alert('Invalid admin credentials');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleGoogleAuth = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      try {
        const res = await fetch('http://localhost:3000/users/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeResponse.code })
        });
        const user = await res.json();
        if (user && user.email) {
          onLogin(user.email, user.role || 'user');
        } else {
          alert('Failed to authenticate with Google');
        }
      } catch(e) {
        alert('Google Login failed');
      }
    }
  });

  const GoogleIcon = () => (
    <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );

  const LogoIcon = () => (
    <div className="w-16 h-16 bg-[#7c3aed] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_4px_20px_rgba(124,58,237,0.4)]">
      <span className="text-3xl grayscale brightness-150 relative top-[-2px]">🐜</span>
    </div>
  );

  const isDark = view === 'admin';

  return (
    <div 
      className={`w-screen h-screen overflow-auto m-0 transition-colors duration-300 ${isDark ? 'bg-[#030712]' : 'bg-[#f8fafc]'} ${view !== 'landing' ? 'flex flex-col items-center justify-center p-4' : ''}`}
      style={{
        backgroundImage: view !== 'landing' ? (isDark 
          ? 'radial-gradient(#1e293b 1px, transparent 1px)' 
          : 'radial-gradient(#cbd5e1 1px, transparent 1px)') : 'none',
        backgroundSize: '24px 24px'
      }}
    >
      {toast.show && (
        <div className="fixed top-4 right-4 bg-white shadow-xl rounded-xl p-4 flex items-center gap-3 z-50 border border-slate-100 max-w-sm">
          <CheckCircle2 className="text-green-500" size={24} />
          <span className="text-sm font-bold text-slate-700">{toast.message}</span>
        </div>
      )}

      {view === 'landing' && (
        <div className="w-full flex flex-col m-0 p-0 overflow-x-hidden relative">
          <div 
            className="w-full min-h-screen flex flex-col items-center justify-center px-4 py-12"
            style={{
              backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              backgroundColor: '#f8fafc'
            }}
          >
            <div className="max-w-3xl text-center space-y-6">
              {savedId && (
                <div className="inline-flex bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl p-3 mb-8 text-left items-center justify-between gap-6 shadow-sm">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Authorized Node</div>
                    <div className="font-bold text-slate-700 text-sm">{savedId}</div>
                  </div>
                  <button 
                    onClick={() => onLogin(savedId)} 
                    className="px-4 py-2 text-xs font-bold bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-lg transition-colors border-none cursor-pointer"
                  >Resume Session</button>
                </div>
              )}

              <LogoIcon />

              <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mt-6">
                Your Warehouse. <span className="text-[#7c3aed]">Simplified.</span>
              </h1>
              <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed mt-6">
                Artificial Intelligence powered B2B Warehouse Intelligence. Control your master records, billing invoices, and barcode registers with natural language commands.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                <button 
                  onClick={() => setView('login')}
                  className="w-full sm:w-auto bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-[#7c3aed]/20 border-none cursor-pointer text-base"
                >
                  Login as User <ArrowRight size={18} />
                </button>
                <button 
                  onClick={() => setView('signup')}
                  className="w-full sm:w-auto bg-[#7c3aed]/10 hover:bg-[#7c3aed]/20 text-[#7c3aed] px-8 py-4 rounded-xl font-bold transition-all border-none cursor-pointer text-base"
                >
                  Sign Up
                </button>
                <button 
                  onClick={() => setView('admin')}
                  className="w-full sm:w-auto bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-8 py-4 rounded-xl font-bold transition-all cursor-pointer text-base shadow-sm"
                >
                  Login as Admin
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#0b0f19] w-full py-24 px-4 flex flex-col items-center relative z-10">
            <h4 className="text-[#d946ef] text-xs font-bold tracking-[0.2em] uppercase mb-4 text-center">Enterprise Core Challenges</h4>
            <h2 className="text-white text-3xl md:text-5xl font-extrabold mb-4 text-center">Warehouse Management ke 3 bade Mudde</h2>
            <p className="text-slate-400 text-base md:text-lg mb-16 max-w-3xl text-center">Manual documentation leads to hidden operational bleed. Inventory Ant provides intelligent automation.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full mx-auto">
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 flex flex-col text-left hover:bg-[#1f2937] transition-colors">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-red-500/10 border border-red-500/20 text-red-500">
                  <ShieldAlert size={24} />
                </div>
                <h3 className="text-white font-bold text-xl mb-3">1. Manual Chaos</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-1">
                  Excel sheets and registers manual maintenance me multiple entries aur formatting mistakes ho hi jaati hain. This causes massive reconciliation headaches.
                </p>
                <div className="w-full h-px bg-slate-800 mb-4"></div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  <span className="text-[#d946ef] text-xs font-bold tracking-wide">Ant X Terminal handles NLP commands</span>
                </div>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 flex flex-col text-left hover:bg-[#1f2937] transition-colors">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-orange-500/10 border border-orange-500/20 text-orange-500">
                  <Cpu size={24} />
                </div>
                <h3 className="text-white font-bold text-xl mb-3">2. Invisible Losses</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-1">
                  Inventory leakage aur undocumented outbound entry stock updates ke lack me identify nahi ho pate. Margin losses are difficult to pinpoint.
                </p>
                <div className="w-full h-px bg-slate-800 mb-4"></div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  <span className="text-[#d946ef] text-xs font-bold tracking-wide">Live Sales Checkout syncs terminal stocks</span>
                </div>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 flex flex-col text-left hover:bg-[#1f2937] transition-colors">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-purple-500/10 border border-purple-500/20 text-purple-500">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-white font-bold text-xl mb-3">3. Expiry & Reorder Ignores</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-1">
                  Low stock levels and batch expiration dates check karna miss ho jata hai. Business loses order momentum when core stocks run dry.
                </p>
                <div className="w-full h-px bg-slate-800 mb-4"></div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  <span className="text-[#d946ef] text-xs font-bold tracking-wide">Smart metrics and automated low-stock warnings</span>
                </div>
              </div>
            </div>
          </div>

          <footer className="w-full bg-[#030712] py-8 border-t border-slate-800 flex flex-col items-center justify-center gap-4 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#7c3aed] rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-sm grayscale brightness-150 relative top-[-1px]">🐜</span>
              </div>
              <span className="text-white font-bold tracking-widest text-sm">INVENTORY ANT</span>
            </div>
            <p className="text-slate-500 text-xs text-center px-4">© 2026 Inventory Ant. B2B Warehouse Intelligence SaaS. All rights reserved.</p>
          </footer>
        </div>
      )}

      {(view === 'login' || view === 'otp') && (
        <div className="bg-white rounded-[2rem] shadow-xl p-8 w-full max-w-md mx-auto border border-slate-100 text-center relative z-10 my-8">
          <LogoIcon />
          <h2 className="text-2xl font-black text-[#7c3aed] m-0 tracking-tight">INVENTORY ANT</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 mb-6">
            B2B Warehouse Intelligence
          </p>

          <div className="flex mb-6 bg-slate-50 p-1 rounded-xl border border-slate-100">
            <button 
              type="button"
              onClick={() => setView('login')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg cursor-pointer transition-all border-none ${view === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}
            >
              Password Login
            </button>
            <button 
              type="button"
              onClick={() => setView('otp')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg cursor-pointer transition-all border-none ${view === 'otp' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}
            >
              OTP Login
            </button>
          </div>

          <h3 className="text-xl font-bold text-slate-800 m-0">
            {view === 'login' ? 'Account Access Portal' : 'OTP Login Access'}
          </h3>
          <p className="text-slate-500 text-sm mt-1 mb-8">
            {view === 'login' ? 'Enter your registered credentials to sign in' : 'Get an OTP to verify and access your account'}
          </p>

          <form onSubmit={handleUserSubmit} className="flex flex-col gap-5 text-left">
            {view === 'login' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email or Phone Number</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="amit@warehouse.com ya 9876543210" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-white text-slate-800 border border-slate-200 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] rounded-xl text-sm outline-none transition-all"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-white text-slate-800 border border-slate-200 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] rounded-xl text-sm outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mobile Number</label>
                <div className="relative flex items-center border border-slate-200 rounded-xl focus-within:border-[#7c3aed] focus-within:ring-1 focus-within:ring-[#7c3aed] bg-white transition-all overflow-hidden">
                  <span className="pl-4 pr-2 py-3.5 text-slate-400 font-bold border-r border-slate-100">+91</span>
                  <input 
                    type="tel" 
                    placeholder="98765 43210" 
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    className="flex-1 px-4 py-3.5 text-slate-800 text-sm outline-none bg-transparent"
                    required
                  />
                  <Phone className="absolute right-4 text-slate-400" size={18} />
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full py-3.5 mt-2 text-base font-bold bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl transition-all shadow-md shadow-[#7c3aed]/20 border-none cursor-pointer flex items-center justify-center gap-2"
            >
              {view === 'login' ? 'Sign In Karein' : 'OTP Send Karein'} <ArrowRight size={18} />
            </button>

            <div className="flex items-center gap-4 my-2">
              <div className="flex-1 h-px bg-slate-100"></div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Ya Phir</span>
              <div className="flex-1 h-px bg-slate-100"></div>
            </div>

            <button 
              type="button" 
              onClick={() => handleGoogleAuth()}
              className="w-full py-3.5 text-sm font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer"
            >
              <GoogleIcon /> Continue with Google
            </button>
          </form>

          <p className="mt-8 mb-0 text-sm text-slate-500 font-medium">
            Naye User hain?{' '}
            <button type="button" onClick={() => setView('signup')} className="text-[#7c3aed] font-bold bg-transparent border-none cursor-pointer p-0 hover:underline">
              Sign Up here
            </button>
          </p>
          
          <button 
            onClick={() => setView('landing')}
            className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none cursor-pointer text-xs font-bold"
          >
            &larr; Back
          </button>
        </div>
      )}

      {view === 'signup' && (
        <div className="bg-white rounded-[2rem] shadow-xl p-8 w-full max-w-md mx-auto border border-slate-100 text-center relative z-10 my-8">
          <LogoIcon />
          <h2 className="text-2xl font-black text-[#7c3aed] m-0 tracking-tight uppercase">Join Inventory Ant</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 mb-8">
            SaaS Warehouse Signup
          </p>

          <form onSubmit={handleUserSubmit} className="flex flex-col gap-5 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Amit Sharma" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white text-slate-800 border border-slate-200 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] rounded-xl text-sm outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  placeholder="amit@warehouse.com" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white text-slate-800 border border-slate-200 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] rounded-xl text-sm outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mobile Number</label>
              <div className="relative flex items-center border border-slate-200 rounded-xl focus-within:border-[#7c3aed] focus-within:ring-1 focus-within:ring-[#7c3aed] bg-white transition-all overflow-hidden">
                <span className="pl-4 pr-2 py-3.5 text-slate-400 font-bold border-r border-slate-100">+91</span>
                <input 
                  type="tel" 
                  placeholder="98765 43210" 
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  className="flex-1 px-4 py-3.5 text-slate-800 text-sm outline-none bg-transparent"
                  required
                />
                <Phone className="absolute right-4 text-slate-400" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Choose Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3.5 bg-white text-slate-800 border border-slate-200 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] rounded-xl text-sm outline-none transition-all"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-0"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3.5 bg-white text-slate-800 border border-slate-200 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] rounded-xl text-sm outline-none transition-all"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-0"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-3.5 mt-2 text-base font-bold bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl transition-all shadow-md shadow-[#7c3aed]/20 border-none cursor-pointer flex items-center justify-center gap-2"
            >
              OTP Mangayein <ArrowRight size={18} />
            </button>

            <div className="flex items-center gap-4 my-2">
              <div className="flex-1 h-px bg-slate-100"></div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Ya Phir</span>
              <div className="flex-1 h-px bg-slate-100"></div>
            </div>

            <button 
              type="button" 
              onClick={() => handleGoogleAuth()}
              className="w-full py-3.5 text-sm font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer"
            >
              <GoogleIcon /> Sign up with Google
            </button>
          </form>

          <p className="mt-8 mb-0 text-sm text-slate-500 font-medium">
            Already registered?{' '}
            <button type="button" onClick={() => setView('login')} className="text-[#7c3aed] font-bold bg-transparent border-none cursor-pointer p-0 hover:underline">
              Sign In Here
            </button>
          </p>
          
          <button 
            onClick={() => setView('landing')}
            className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none cursor-pointer text-xs font-bold"
          >
            &larr; Back
          </button>
        </div>
      )}

      {view === 'verify-otp' && (
        <div className="bg-white rounded-[2rem] shadow-xl p-8 w-full max-w-md mx-auto border border-slate-100 text-center relative z-10 my-8">
          <LogoIcon />
          <h2 className="text-2xl font-black text-[#7c3aed] m-0 tracking-tight uppercase">Join Inventory Ant</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 mb-8">
            SaaS Warehouse Signup
          </p>

          <h3 className="text-xl font-bold text-slate-800 m-0">Verify OTP</h3>
          <p className="text-slate-500 text-sm mt-1 mb-6">
            Enter 6 digit code sent to +91 {mobile}
          </p>

          <form onSubmit={handleOtpSubmit} className="flex flex-col gap-6 text-left">
            <div className="flex justify-center gap-2 mb-2">
              {enteredOtp.map((data, index) => {
                return (
                  <input
                    key={index}
                    type="text"
                    maxLength="1"
                    value={data}
                    onChange={e => handleOtpChange(e.target, index)}
                    onFocus={e => e.target.select()}
                    className="w-12 h-14 text-center text-xl font-bold text-slate-800 bg-white border border-slate-200 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] rounded-xl outline-none transition-all"
                  />
                );
              })}
            </div>

            <button 
              type="submit" 
              className="w-full py-4 mt-2 text-base font-bold bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl transition-all shadow-md shadow-[#6366f1]/20 border-none cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} /> OTP Verify & Sign Up
            </button>
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-bold text-[#7c3aed]">Resend OTP in 59s</span>
              <button type="button" className="text-sm font-bold text-slate-300 flex items-center gap-1 bg-transparent border-none cursor-not-allowed">
                <RefreshCw size={14} /> Resend OTP
              </button>
            </div>
          </form>

          <button 
            onClick={() => setView('signup')}
            className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none cursor-pointer text-xs font-bold"
          >
            &larr; Back
          </button>
        </div>
      )}

      {view === 'admin' && (
        <div className="bg-[#0f172a] rounded-[2rem] shadow-2xl p-8 w-full max-w-md mx-auto border border-[#1e293b] text-center relative z-10 my-8">
          <LogoIcon />
          <h2 className="text-2xl font-black text-white m-0 tracking-tight uppercase">Inventory Ant Admin</h2>
          <p className="text-[#c084fc] text-[10px] font-bold uppercase tracking-[0.2em] mt-1 mb-10">
            Super User Security Console
          </p>

          <form onSubmit={handleAdminSubmit} className="flex flex-col gap-6 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Admin Username</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Enter admin username" 
                  value={adminUsername}
                  onChange={e => setAdminUsername(e.target.value)}
                  className="w-full pl-4 pr-11 py-3.5 bg-[#0b0f19] text-white border border-[#1e293b] focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] rounded-xl text-sm outline-none transition-all placeholder-slate-600"
                  required
                />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Console Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-3.5 bg-[#0b0f19] text-white border border-[#1e293b] focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] rounded-xl text-sm outline-none transition-all placeholder-slate-600"
                  required
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-4 mt-2 text-sm font-bold bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl transition-all shadow-lg shadow-[#7c3aed]/20 border-none cursor-pointer flex items-center justify-center gap-2"
            >
              Console Access verify karein
            </button>
          </form>

          <p className="mt-8 mb-0 text-[11px] text-slate-500 font-medium leading-relaxed max-w-[90%] mx-auto">
            Dhyan dein: Yaha se plans aur clients database adjust kiye ja sakte hain. Any modification will be logged in the audit-trail.
          </p>

          <button 
            onClick={() => setView('landing')}
            className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors bg-transparent border-none cursor-pointer text-xs font-bold"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default AuthScreen;
