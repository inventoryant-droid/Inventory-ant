import React, { useState, useEffect, useRef, useMemo } from 'react';
import './App.css';
import AntAgentV2 from './components/AntAgentV2';
import AntXTerminal from './components/AntXTerminal';

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

export default function App() {


  const initialRole = localStorage.getItem('ant_role') || 'user';
  const [userId, setUserId] = useState(localStorage.getItem('ant_user') || '');
  const [userRole, setUserRole] = useState(initialRole);
  const [view, setView] = useState(initialRole === 'admin' ? 'admin_panel' : 'dashboard');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [products, setProducts] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('ant_theme') || 'dark');
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  
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

  const handleLogin = (id, role = 'user') => {
     const normalized = id.trim().toLowerCase();
     setUserId(normalized);
     setUserRole(role);
     localStorage.setItem('ant_user', normalized);
     localStorage.setItem('ant_role', role);
     setView(role === 'admin' ? 'admin_panel' : 'dashboard');
  }
  const handleLogout = () => {
     setUserId('');
     setUserRole('user');
     setProducts([]);
     setInventoryFilter('all');
     localStorage.removeItem('ant_user');
     localStorage.removeItem('ant_role');
     setView('dashboard');
  };

  const handleSwitchAccount = () => {
     setUserId('');
     setProducts([]);
     setInventoryFilter('all');
     setView('dashboard');
  };

  const fetchProducts = () => {
    if(!userId) return;
    fetch('http://localhost:3000/products', { headers: { 'x-user-id': userId } })
      .then(res => res.json())
      .then(data => {
         setProducts(data);
         if (data.length === 0 && !hasShownWelcome) {
            setShowWelcomePopup(true);
            setHasShownWelcome(true);
         }
      })
      .catch(err => console.error("Failed to fetch:", err));
  };

  useEffect(() => {
    fetchProducts();
  }, [userId]);

  const handleAddProduct = async (data) => {
    try {
      const res = await fetch('http://localhost:3000/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify(data)
      });
      const newP = await res.json();
      setProducts([...products, newP]);
    } catch(e) {}
  };

  const handleDeleteProduct = async (id) => {
    try {
      await fetch(`http://localhost:3000/products/${id}`, { method: 'DELETE', headers: { 'x-user-id': userId } });
      setProducts(products.filter(p => p.id !== id));
    } catch(e) {}
  };

  const handleEditProduct = async (id, updatedData) => {
    try {
      const res = await fetch(`http://localhost:3000/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify(updatedData)
      });
      const updatedProduct = await res.json();
      setProducts(products.map(p => p.id === id ? updatedProduct : p));
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
      {!userId ? (
        <AuthScreen onLogin={handleLogin} />
      ) : (
        <div className={(theme === 'dark' ? 'dark-theme ' : 'light-theme ') + "flex flex-col md:flex-row w-full min-h-screen bg-[#F8FAFC]"}>
          <Sidebar setView={setView} view={view} userId={userId} userRole={userRole} onLogout={handleLogout} onSwitchAccount={handleSwitchAccount} setInventoryFilter={setInventoryFilter} theme={theme} onToggleTheme={toggleTheme} />
          
          {userRole !== 'admin' && view === 'dashboard' && <Dashboard 
            products={products} 
            userId={userId} 
            onAlertClick={(mode) => { setView('inventory'); setInventoryFilter(mode); }} 
            onTotalClick={() => { setView('inventory'); setInventoryFilter('all'); }}
            onOpenScanner={handleOpenScanner}
            onGoToSettings={() => setView('settings')}
          />}
          {userRole !== 'admin' && view === 'billing' && <Billing products={products} onSaleSuccess={fetchProducts} userId={userId} />}
          {userRole !== 'admin' && view === 'inventory' && <Inventory products={products} onAddProduct={handleAddProduct} onDeleteProduct={handleDeleteProduct} onEditProduct={handleEditProduct} filterMode={inventoryFilter} setFilterMode={setInventoryFilter} />}
          {userRole !== 'admin' && view === 'ai_lab' && <AITools userId={userId} onScanResult={fetchProducts} onOpenScanner={handleOpenScanner} />}
          {userRole !== 'admin' && view === 'ant_x' && <AntXTerminal 
            userId={userId} 
            onUpdate={fetchProducts} 
            onNavigate={(page) => setView(page)} 
            onLogin={handleLogin} 
            currentView={view} 
            voiceState={{ isVoiceActive, setIsVoiceActive, globalTranscript, globalAiResponse, globalStatus }}
          />}

          {/* Shared Views */}
          {view === 'settings' && <Settings userId={userId} onScanResult={fetchProducts} />}
          {view === 'admin_panel' && userRole === 'admin' && <AdminPanel />}
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
            onScanSuccess={fetchProducts} 
          />

          {/* ALWAYS MOUNTED VOICE CORE */}
          <AntAgentV2 
            userId={userId || 'guest_node'} 
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
      )}
    </>
  );
}



