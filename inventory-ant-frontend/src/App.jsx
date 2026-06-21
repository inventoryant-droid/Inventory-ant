import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import AntAgentV2 from './components/AntAgentV2';
import AntXTerminal from './components/AntXTerminal';
import { API_BASE_URL } from './utils/config';

import AuthScreen from './pages/AuthScreen';
import UserGuide from './pages/UserGuide';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import ScannerModal from './components/ui/ScannerModal';
import AITools from './pages/AITools';
import Settings from './pages/Settings';
import Billing from './pages/Billing';
import Inventory from './pages/Inventory';
import About from './pages/About';
import AdminPanel from './pages/AdminPanel';
import WelcomeModal from './components/ui/WelcomeModal';
import OnboardingScreen from './pages/OnboardingScreen';
import Profile from './pages/Profile';
import StaffManagement from './pages/StaffManagement';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState(localStorage.getItem('ant_token') || '');
  const [userId, setUserId] = useState(localStorage.getItem('ant_user') || '');
  const [userRole, setUserRole] = useState(localStorage.getItem('ant_role') || 'user');
  const [view, setView] = useState('dashboard');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [products, setProducts] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('ant_theme') || 'dark');
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  // GLOBAL VOICE CORE STATE
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [globalTranscript, setGlobalTranscript] = useState('');
  const [globalAiResponse, setGlobalAiResponse] = useState('');
  const [globalStatus, setGlobalStatus] = useState('');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('ant_theme', newTheme);
  };

  const handleLogin = (id, role = 'user', accessToken = '') => {
     const normalized = id.trim().toLowerCase();
     setUserId(normalized);
     setUserRole(role);
     setToken(accessToken);
     localStorage.setItem('ant_user', normalized);
     localStorage.setItem('ant_role', role);
     localStorage.setItem('ant_token', accessToken);
     
     if (role === 'admin') {
       navigate('/admin');
     } else {
       setView('dashboard');
       navigate('/dashboard');
     }
  };

  const handleLogout = () => {
     setUserId('');
     setUserRole('user');
     setToken('');
     setProducts([]);
     setInventoryFilter('all');
     localStorage.removeItem('ant_user');
     localStorage.removeItem('ant_role');
     localStorage.removeItem('ant_token');
     navigate('/login');
  };

  const handleSwitchAccount = () => {
     handleLogout();
  };

  const fetchProducts = () => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/user/products`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    })
      .then(res => res.json())
      .then(data => {
         if (Array.isArray(data)) {
            setProducts(data);
            if (data.length === 0 && !hasShownWelcome) {
               setShowWelcomePopup(true);
               setHasShownWelcome(true);
            }
         }
      })
      .catch(err => console.error("Failed to fetch products:", err));
  };

  const fetchProfile = () => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/user/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
         if (!res.ok) throw new Error("Failed to fetch profile");
         return res.json();
      })
      .then(data => {
         setUserProfile(data);
      })
      .catch(err => console.error("Profile fetch error:", err));
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setUserProfile(null);
    }
  }, [token]);

  useEffect(() => {
    if (token && (userRole === 'user' || userRole === 'staff')) {
      fetchProducts();
    }
  }, [userId, token, userRole]);

  const handleProfileCompleted = (updatedProfile) => {
    setUserProfile(updatedProfile);
    if (updatedProfile.email && updatedProfile.email.toLowerCase() !== userId.toLowerCase()) {
      const newEmail = updatedProfile.email.toLowerCase();
      setUserId(newEmail);
      localStorage.setItem('ant_user', newEmail);
    }
  };

  // Route protection and redirection checks
  useEffect(() => {
    const publicPaths = ['/', '/login', '/signup'];
    const isPublicPath = publicPaths.includes(location.pathname);

    if (!token) {
      if (!isPublicPath) {
        navigate('/login');
      }
    } else {
      if (isPublicPath) {
        if (userRole === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else if (location.pathname === '/admin' && userRole !== 'admin') {
        navigate('/dashboard');
      } else if (location.pathname === '/dashboard' && userRole === 'admin') {
        navigate('/admin');
      }
    }
  }, [token, userRole, location.pathname, navigate]);

  const handleAddProduct = async (data) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/products`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(data)
      });
      const newP = await res.json();
      if (newP && newP.id) {
        setProducts([...products, newP]);
      }
    } catch(e) {}
  };

  const handleDeleteProduct = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/api/user/products/${id}`, { 
        method: 'DELETE', 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      setProducts(products.filter(p => p.id !== id));
    } catch(e) {}
  };

  const handleEditProduct = async (id, updatedData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/products/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(updatedData)
      });
      const updatedProduct = await res.json();
      if (updatedProduct && updatedProduct.id) {
        setProducts(products.map(p => p.id === id ? updatedProduct : p));
      }
    } catch(e) {}
  };

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerType, setScannerType] = useState('IN');

  const handleOpenScanner = (type) => {
    setScannerType(type);
    setScannerOpen(true);
  };

  return (
    <Routes>
      <Route path="/" element={<AuthScreen onLogin={handleLogin} defaultView="landing" />} />
      <Route path="/login" element={<AuthScreen onLogin={handleLogin} defaultView="login" />} />
      <Route path="/signup" element={<AuthScreen onLogin={handleLogin} defaultView="signup" />} />
      <Route path="/dashboard" element={
        token && (userRole === 'user' || userRole === 'staff') ? (
          userRole === 'user' && userProfile && !userProfile.profileCompleted ? (
            <OnboardingScreen 
              token={token} 
              userProfile={userProfile} 
              onProfileCompleted={handleProfileCompleted} 
              onLogout={handleLogout} 
              theme={theme}
            />
          ) : (
            <div className={(theme === 'dark' ? 'dark-theme ' : 'light-theme ') + "flex flex-col w-full min-h-screen bg-[#F8FAFC]"}>
              {localStorage.getItem('ant_admin_token') && (
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
                      
                      setToken(adminToken);
                      setUserId(adminUser);
                      setUserRole(adminRole);
                      navigate('/admin');
                    }}
                    className="bg-white text-[#EF4444] hover:bg-[#FEE2E2] font-semibold px-4 py-1.5 rounded-lg text-sm transition-all duration-200 shadow-sm border-none cursor-pointer"
                  >
                    Exit & Return to Admin
                  </button>
                </div>
              )}
              <div className="flex flex-col md:flex-row w-full flex-1">
                <Sidebar 
                setView={setView} 
                view={view} 
                userId={userId} 
                userRole={userRole} 
                onLogout={handleLogout} 
                onSwitchAccount={handleSwitchAccount} 
                setInventoryFilter={setInventoryFilter} 
                theme={theme} 
                onToggleTheme={toggleTheme} 
                userProfile={userProfile}
              />
              
              {view === 'dashboard' && <Dashboard 
                products={products} 
                userId={userId} 
                onAlertClick={(mode) => { setView('inventory'); setInventoryFilter(mode); }} 
                onTotalClick={() => { setView('inventory'); setInventoryFilter('all'); }}
                onOpenScanner={handleOpenScanner}
                onGoToProfile={() => setView('profile')}
                onGoToSettings={() => setView('settings')}
                userProfile={userProfile}
                userRole={userRole}
              />}
              {view === 'billing' && <Billing products={products} onSaleSuccess={fetchProducts} userId={userId} token={token} userProfile={userProfile} />}
              {view === 'inventory' && <Inventory products={products} onAddProduct={handleAddProduct} onDeleteProduct={handleDeleteProduct} onEditProduct={handleEditProduct} filterMode={inventoryFilter} setFilterMode={setInventoryFilter} userRole={userRole} />}
              {view === 'ai_lab' && <AITools userId={userId} token={token} onScanResult={fetchProducts} onOpenScanner={handleOpenScanner} userProfile={userProfile} theme={theme} />}
              {view === 'staff_management' && <StaffManagement token={token} userProfile={userProfile} userId={userId} />}
              {view === 'ant_x' && <AntXTerminal 
                userId={userId} 
                token={token}
                onUpdate={fetchProducts} 
                onNavigate={(page) => setView(page)} 
                onLogin={handleLogin} 
                currentView={view} 
                voiceState={{ isVoiceActive, setIsVoiceActive, globalTranscript, globalAiResponse, globalStatus }}
              />}

              {/* Shared Views */}
              {view === 'settings' && <Settings userId={userId} token={token} onScanResult={fetchProducts} userProfile={userProfile} onProfileUpdate={handleProfileCompleted} userRole={userRole} />}
              {view === 'profile' && <Profile token={token} userProfile={userProfile} onProfileUpdate={handleProfileCompleted} theme={theme} userRole={userRole} />}
              {view === 'guide' && <UserGuide />}
              {view === 'about' && <About theme={theme} />}

              <WelcomeModal 
                isOpen={showWelcomePopup} 
                onClose={() => setShowWelcomePopup(false)} 
                onUploadCSV={() => { setShowWelcomePopup(false); setView('settings'); }} 
                onAddManually={() => { setShowWelcomePopup(false); setView('inventory'); }} 
              />

              <ScannerModal 
                isOpen={scannerOpen} 
                onClose={() => setScannerOpen(false)} 
                scanType={scannerType} 
                userId={userId} 
                token={token}
                onScanSuccess={fetchProducts} 
              />

              {/* ALWAYS MOUNTED VOICE CORE */}
              <AntAgentV2 
                userId={userId || 'guest_node'} 
                token={token}
                onUpdate={fetchProducts} 
                onNavigate={(page) => setView(page)} 
                onLogin={handleLogin} 
                currentView={view} 
                isTerminalView={view === 'ant_x'}
                sharedState={{ 
                   isVoiceActive, setIsVoiceActive, 
                   setGlobalTranscript, setGlobalAiResponse, setGlobalStatus 
                }}
              />
              </div>
            </div>
          )
        ) : <Navigate to="/login" replace />
      } />
      <Route path="/admin" element={
        token && userRole === 'admin' ? (
          <div className={(theme === 'dark' ? 'dark-theme ' : 'light-theme ') + "flex flex-col md:flex-row w-full min-h-screen bg-[#F8FAFC]"}>
            <Sidebar 
              setView={setView} 
              view="admin_panel" 
              userId={userId} 
              userRole={userRole} 
              onLogout={handleLogout} 
              onSwitchAccount={handleSwitchAccount} 
              setInventoryFilter={setInventoryFilter} 
              theme={theme} 
              onToggleTheme={toggleTheme} 
            />
            <AdminPanel token={token} onLogout={handleLogout} userProfile={userProfile} />
          </div>
        ) : <Navigate to="/login" replace />
      } />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
