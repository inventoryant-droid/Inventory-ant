import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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
import AdminPanel from './pages/AdminPanel';
import WelcomeModal from './components/ui/WelcomeModal';
import OnboardingScreen from './pages/OnboardingScreen';
import Profile from './pages/Profile';
import StaffManagement from './pages/StaffManagement';
import HistoryLogs from './pages/HistoryLogs';

import MarketingHome from './pages/MarketingHome';
import MarketingPricing from './pages/MarketingPricing';
import MarketingAbout from './pages/MarketingAbout';
import MarketingMobileApp from './pages/MarketingMobileApp';
import { MarketingLayout } from './components/layout/MarketingLayout';
import DashboardLayout from './components/layout/DashboardLayout';



export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState(localStorage.getItem('ant_token') || '');
  const [userId, setUserId] = useState(localStorage.getItem('ant_user') || '');
  const [userRole, setUserRole] = useState(localStorage.getItem('ant_role') || 'user');
  const [view, setView] = useState('dashboard');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [products, setProducts] = useState([]);
  // Temporarily forced to 'light' to disable dark theme
  const [theme, setTheme] = useState('light');
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  // GLOBAL VOICE CORE STATE
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [globalTranscript, setGlobalTranscript] = useState('');
  const [globalAiResponse, setGlobalAiResponse] = useState('');
  const [globalStatus, setGlobalStatus] = useState('');

  const toggleTheme = () => {
    // Temporarily disabled
  };

  const handleLogin = (id, role = 'user', accessToken = '', refreshToken = '') => {
     const normalized = id.trim().toLowerCase();
     setUserId(normalized);
     setUserRole(role);
     setToken(accessToken);
     localStorage.setItem('ant_user', normalized);
     localStorage.setItem('ant_role', role);
     localStorage.setItem('ant_token', accessToken);
     if (refreshToken) {
       localStorage.setItem('ant_refresh_token', refreshToken);
     }
     
     if (role === 'admin') {
       navigate('/admin');
     } else {
       setView('dashboard');
       navigate('/dashboard');
     }
  };

  const handleLogout = () => {
     localStorage.removeItem('ant_user');
     localStorage.removeItem('ant_role');
     localStorage.removeItem('ant_token');
     localStorage.removeItem('ant_refresh_token');
     
     navigate('/', { replace: true });
     
     setTimeout(() => {
       setUserId('');
       setUserRole('user');
       setToken('');
       setProducts([]);
       setInventoryFilter('all');
     }, 50);
  };

  useEffect(() => {
    const handleTokenRefreshed = (e) => {
      setToken(e.detail.token);
    };
    const handleTokenExpired = () => {
      handleLogout();
    };
    window.addEventListener('token-refreshed', handleTokenRefreshed);
    window.addEventListener('token-expired', handleTokenExpired);
    return () => {
      window.removeEventListener('token-refreshed', handleTokenRefreshed);
      window.removeEventListener('token-expired', handleTokenExpired);
    };
  }, []);

  // System theme listener disabled temporarily

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
    const publicPaths = ['/', '/login', '/signup', '/pricing', '/about', '/mobile-app'];
    const isPublicPath = publicPaths.includes(location.pathname);

    const hasToken = !!localStorage.getItem('ant_token');

    if (!hasToken) {
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
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        <Route path="/" element={<MarketingLayout><MarketingHome /></MarketingLayout>} />
        <Route path="/pricing" element={<MarketingLayout><MarketingPricing /></MarketingLayout>} />
        <Route path="/about" element={<MarketingLayout><MarketingAbout /></MarketingLayout>} />
        <Route path="/mobile-app" element={<MarketingLayout><MarketingMobileApp /></MarketingLayout>} />
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
            <DashboardLayout
              view={view}
              setView={setView}
              userId={userId}
              userRole={userRole}
              onLogout={handleLogout}
              onSwitchAccount={handleSwitchAccount}
              setInventoryFilter={setInventoryFilter}
              theme={theme}
              onToggleTheme={toggleTheme}
              userProfile={userProfile}
            >
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
                onProfileUpdate={handleProfileCompleted}
                token={token}
              />}
              {view === 'billing' && <Billing products={products} onSaleSuccess={fetchProducts} userId={userId} token={token} userProfile={userProfile} />}
              {view === 'inventory' && <Inventory products={products} onAddProduct={handleAddProduct} onDeleteProduct={handleDeleteProduct} onEditProduct={handleEditProduct} filterMode={inventoryFilter} setFilterMode={setInventoryFilter} userRole={userRole} userProfile={userProfile} />}
              {view === 'ai_lab' && <AITools userId={userId} token={token} onScanResult={fetchProducts} onOpenScanner={handleOpenScanner} userProfile={userProfile} theme={theme} />}
              {view === 'history' && <HistoryLogs userId={userId} token={token} userProfile={userProfile} products={products} />}
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
                onNavigate={(viewName) => { setView(viewName); setScannerOpen(false); }}
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
            </DashboardLayout>
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
    </>
  );
}
