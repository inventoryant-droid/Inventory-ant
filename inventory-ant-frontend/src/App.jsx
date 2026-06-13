import React, { useState, useEffect, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import './App.css';
import AntAgentV2 from './components/AntAgentV2';
import AntXTerminal from './components/AntXTerminal';

// --- GLOBAL HELPER: EXPIRES LOGIC ---
const getExpiryInfo = (val) => {
  if (!val || String(val).trim() === '' || String(val).toLowerCase() === 'none') {
    return { status: 'NONE', color: 'inherit', daysLeft: 999 };
  }
  
  const now = new Date();
  now.setHours(0,0,0,0);
  
  let expDate = null;
  const str = String(val).trim();
  
  // Strict parsing for common formats
  const parts = str.split(/[-/.]/); 
  
  try {
    if (parts.length === 3) {
      let p0 = parseInt(parts[0]);
      let p1 = parseInt(parts[1]);
      let p2 = parseInt(parts[2]);

      // If first part is Year (YYYY)
      if (parts[0].length === 4) {
        // Smart Check for Y.D.M vs Y.M.D
        // If p1 > 12, then p1 is definitely the Day (Y.D.M)
        if (p1 > 12) {
          expDate = new Date(p0, p2 - 1, p1);
        } else {
          expDate = new Date(p0, p1 - 1, p2);
        }
      } 
      // If last part is Year (YYYY or YY)
      else {
        let y = p2;
        if (y < 100) y += 2000;
        // Smart Check: If p0 > 12, then p0 is Day (D.M.Y)
        if (p0 > 12) {
          expDate = new Date(y, p1 - 1, p0);
        } else if (p1 > 12) {
          expDate = new Date(y, p0 - 1, p1);
        } else {
          expDate = new Date(y, p1 - 1, p0); // Default D.M.Y
        }
      }
    } else if (parts.length === 2) {
      // MM/YYYY or MM/YY
      let m = parseInt(parts[0]);
      let y = parseInt(parts[1]);
      if (y < 100) y += 2000;
      // Expiry is end of month
      expDate = new Date(y, m, 0); 
    }
  } catch(e) {}

  // Fallback to native parsing only if structured parsing failed
  if (!expDate || isNaN(expDate.getTime())) {
    expDate = new Date(str);
  }

  if (!(expDate instanceof Date) || isNaN(expDate.getTime())) {
    return { status: 'NONE', color: 'inherit', daysLeft: 999 };
  }
  
  expDate.setHours(0,0,0,0);
  const diffTime = expDate.getTime() - now.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { status: 'EXPIRED', color: 'var(--danger)', daysLeft: diffDays };
  if (diffDays >= 0 && diffDays <= 30) return { status: 'EXPIRING SOON', color: 'var(--warning)', daysLeft: diffDays };
  return { status: 'HEALTHY', color: 'var(--neon-accent)', daysLeft: diffDays };
};

const getExpKey = (cols) => {
  return cols.find(k => {
    const lk = k.toLowerCase();
    return (lk.includes('expir') || lk.includes('exp.')) && !lk.includes('export') && !lk.includes('expens');
  });
};

function AuthScreen({ onLogin }) {
  const [shopName, setShopName] = useState('');
  const savedId = localStorage.getItem('ant_user');

  const submit = (e) => {
     e.preventDefault();
     if(shopName.trim()) onLogin(shopName);
  }

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      background: 'var(--bg-dark)',
      overflow: 'hidden',
      margin: 0,
      padding: 0
    }}>
      {/* Left Side: AI Animation Engine */}
      <div style={{ 
        flex: 1, 
        background: 'radial-gradient(circle at center, var(--sidebar-bg) 0%, var(--bg-dark) 100%)', 
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRight: '1px solid var(--glass-border)'
      }}>
        <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 10 }}>
           <h2 style={{ color: 'rgba(59, 130, 246, 0.5)', fontSize: '0.7rem', letterSpacing: '4px', textTransform: 'uppercase', margin: 0 }}>Neural Core v4.0</h2>
           <div style={{ color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>AI_SUPPLY_CHAIN_ACTIVE</div>
        </div>
        
        <div style={{ width: '90%', height: '80%' }}>
           <AntSupplyChain />
        </div>

        {/* Decorative Elements */}
        <div style={{ position: 'absolute', bottom: '40px', left: '40px', color: 'var(--text-muted)', fontSize: '0.6rem', fontFamily: 'monospace' }}>
           SYSTEM_SYNC: OK <br/>
           MEMORY_INDEX: 0x9AF2 <br/>
           ANT_X_READY: TRUE
        </div>
      </div>

      {/* Right Side: Login Card */}
      <div style={{ 
        width: '450px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        position: 'relative',
        background: '#000',
        padding: '2rem'
      }}>
        <div className="glass-panel" style={{ 
          width: '100%', 
          padding: '2.5rem 2rem', 
          textAlign: 'center', 
          border: '1px solid rgba(59, 130, 246, 0.2)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
        }}>
            {/* Removed scan-line for a cleaner look */}
            
            <div style={{ marginBottom: '2.5rem' }}>
               <div style={{ fontSize: '3.5rem', marginBottom: '1.2rem', animation: 'pulse-blue 2s infinite ease-in-out' }}>🐜</div>
               <h2 style={{ color: 'rgba(59, 130, 246, 0.7)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>System Access</h2>
               <h1 style={{ 
                  margin: 0, 
                  fontSize: '2.2rem', 
                  fontWeight: '800', 
                  color: 'var(--danger)',
                  letterSpacing: '-1px'
               }}>Inventory <span style={{color: 'var(--danger)'}}>Ant</span></h1>
               <p style={{ color: 'var(--text-muted)', marginTop: '0.6rem', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Secure terminal for autonomous <br/> warehouse management.
               </p>
            </div>
            
            {savedId && (
              <div style={{ 
                background: 'rgba(59, 130, 246, 0.03)', 
                border: '1px solid rgba(59, 130, 246, 0.15)', 
                borderRadius: '12px', 
                padding: '1rem', 
                marginBottom: '1.5rem', 
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>Authorized Node</div>
                  <div style={{ fontWeight: 'bold', color: '#60A5FA', fontSize: '1rem', fontFamily: 'monospace' }}>{savedId}</div>
                </div>
                <button 
                  onClick={() => onLogin(savedId)} 
                  className="btn-primary"
                  style={{ padding: '0.5rem 0.8rem', fontSize: '0.75rem', background: '#3B82F6', color: 'var(--text-main)', border: 'none' }}
                >Resume</button>
              </div>
            )}

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
               <input 
                  autoFocus 
                  type="text" 
                  placeholder="Enter Workspace ID" 
                  value={shopName} 
                  onChange={e=>setShopName(e.target.value)} 
                  style={{ 
                    width: '100%',
                    padding: '1.2rem', 
                    background: 'rgba(255,255,255,0.03)', 
                    color: 'var(--text-main)', 
                    border: '1px solid rgba(59, 130, 246, 0.1)', 
                    borderRadius: '12px', 
                    fontSize: '1rem', 
                    textAlign: 'center', 
                    outline: 'none'
                  }}
               />
               <button type="submit" className="btn-primary" style={{ padding: '1.2rem', fontSize: '1rem', width: '100%', background: '#3B82F6', color: 'var(--text-main)', border: 'none' }}>Login</button>
            </form>
        </div>
      </div>
    </div>
  )
}


function UserGuide() {
  return (
    <div style={{ padding: '2rem', flex: 1, overflowY: 'auto', paddingBottom: '10rem' }}>
      <h1 style={{ marginTop: 0, fontSize: '2.5rem' }}>User <span className="glow-text">Guide</span></h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '3rem' }}>
        Inventory Ant use karna bahut asaan hai. Niche diye gaye simple steps follow karein:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
        <div className="ai-card" style={{ borderLeft: '4px solid var(--neon-accent)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <span>🚀</span> 1. Pehla Kadam (CSV Upload)
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
            - Apna pura stock list (inventory) ek Excel/CSV format me banayein.<br/>
            - <strong>Settings</strong> page me ja kar "Upload CSV File" button par click karein.<br/>
            - System automatically aapke Item Code, Name, aur Expiry ko samajh kar save kar lega.
          </p>
        </div>

        <div className="ai-card" style={{ borderLeft: '4px solid #A855F7' }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <span>🎙️</span> 2. Ant X AI (Voice Commands)
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
            - Kisi bhi page par neeche diye gaye Mike button ko dabayein.<br/>
            - Boliye: <em>"Item Code 20 ke 50 piece add karo"</em>.<br/>
            - Agar aap item ka naam bolte hain aur system ko 2 same naam wale items milte hain, toh AI aapse exact details poochega (jaise 80 page ya 100 page).
          </p>
        </div>

        <div className="ai-card" style={{ borderLeft: '4px solid #10B981' }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <span>📥</span> 3. Inbound (Maal Add Karna)
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
            - Jab dukaan me naya maal aaye, toh <strong>Smart Scanner</strong> me ja kar apne Purchase Bill ki photo upload karein.<br/>
            - AI automatically items ka naam aur quantity padh kar stock me add kar dega.
          </p>
        </div>

        <div className="ai-card" style={{ borderLeft: '4px solid #F59E0B' }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <span>🛒</span> 4. Outbound / Billing (Maal Bechna)
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
            - Grahak ko saman dete waqt <strong>Billing</strong> tab me jayein.<br/>
            - Item search karein ya Ant X ko bol kar cart me add karein.<br/>
            - "Complete Sale" dabate hi stock minus ho jayega.
          </p>
        </div>

        <div className="ai-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <span>🗑️</span> 5. Clear Data (Reset)
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
            - Agar aap sab kuch zero se shuru karna chahte hain, toh <strong>Settings</strong> me jayein.<br/>
            - "Clear Data" dabayein. Dhyan rahe, isse saara stock delete ho jayega.
          </p>
        </div>
      </div>
    </div>
  );
}


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
    <div className="glass-panel" style={{ 
      width: '280px', 
      height: 'calc(100vh - 2rem)', 
      margin: '1rem', 
      padding: '1.8rem', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1.8rem', 
      position: 'sticky', 
      top: '1rem', 
      background: 'var(--sidebar-bg)',
      border: '1px solid var(--glass-border)',
      overflowY: 'auto',
      transition: 'all 0.3s ease'
    }}>
      <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--text-main)' }}>
        <span style={{ fontSize: '1.6rem' }}>🐜</span> 
        <span style={{ letterSpacing: '1px', color: theme === 'light' ? 'var(--neon-accent)' : 'red' }}>INVENTORY ANT</span>
      </h2>
      
      <div style={{ background: 'var(--bg-card)', padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
         <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>User ID</div>
         <div style={{ color: 'var(--neon-accent)', fontWeight: 'bold', fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userId}</div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {navItems.map(item => (
          <button 
            key={item.id}
            onClick={() => {
              // When clicking Inventory in sidebar, always reset filter to show ALL items
              if (item.id === 'inventory') {
                setInventoryFilter('all');
              }
              setView(item.id);
            }} 
            style={{ 
              textAlign: 'left', 
              border: 'none', 
              padding: '0.9rem 1.2rem', 
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              background: view === item.id ? 'var(--neon-accent)' : 'transparent', 
              color: view === item.id ? 'var(--bg-dark)' : 'var(--text-main)',
              opacity: view === item.id ? 1 : 0.6,
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: view === item.id ? '700' : '500',
              cursor: 'pointer',
              transition: '0.2s ease'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap:'0.8rem', paddingBottom: '1rem' }}>
        <button onClick={onSwitchAccount} className="btn-primary" style={{ borderStyle: 'solid', fontSize: '0.7rem' }}>🔄 Switch Workspace</button>
        <button onClick={onToggleTheme} className="btn-primary" style={{ borderStyle: 'solid', fontSize: '0.7rem', background: 'rgba(99, 102, 241, 0.1)', borderColor: 'var(--neon-accent)' }}>
           {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
        <button onClick={onLogout} className="btn-primary" style={{ borderStyle: 'dashed', opacity: 0.7, color: 'var(--danger)', borderColor: 'var(--danger)' }}>Logout</button>
      </div>
    </div>
  );
}

function Dashboard({ products, userId, onAlertClick, onTotalClick, onOpenScanner, onGoToSettings }) {
  const dynamicColumns = useMemo(() => {
    const cols = new Set();
    products.forEach(p => Object.keys(p).forEach(k => {
      if (!['id', 'userId', 'quantity', 'mrp', 'productId', 'name', 'details'].includes(k)) {
          cols.add(k);
      }
    }));
    return Array.from(cols);
  }, [products]);

  const expKey = getExpKey(dynamicColumns);
  const lowStockCount = products.filter(p => {
    const q = parseInt(p.quantity || '0', 10);
    return !isNaN(q) && q < 20;
  }).length;

  const { expiredCount, expiringSoonCount } = useMemo(() => {
    if (!expKey) return { expiredCount: 0, expiringSoonCount: 0 };
    let expired = 0;
    let soon = 0;

    products.forEach(p => {
      const info = getExpiryInfo(p[expKey]);
      if (info.status === 'EXPIRED') expired++;
      else if (info.status === 'EXPIRING SOON') soon++;
    });

    return { expiredCount: expired, expiringSoonCount: soon };
  }, [products, expKey]);

  const totalStock = products.reduce((acc, p) => acc + (parseInt(p.quantity || '0', 10) || 0), 0);

  return (
    <div style={{ padding: '2rem', flex: 1 }}>
      <h1 style={{ marginTop: 0, fontSize: '2.5rem', fontWeight: '800' }}>System <span className="glow-text">Overview</span></h1>
      
      {products.length === 0 && (
        <div className="glass-panel" style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.4)', padding: '2.5rem', marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
           <div style={{ fontSize: '3.5rem', marginBottom: '1rem', animation: 'float 3s infinite ease-in-out' }}>👋</div>
           <h2 style={{ margin: 0, color: '#60A5FA', fontSize: '2rem' }}>Welcome to Inventory Ant!</h2>
           <p style={{ color: 'var(--text-main)', maxWidth: '600px', lineHeight: '1.6', fontSize: '1.1rem', marginTop: '1rem' }}>
             Aapka warehouse abhi khali hai. System ko start karne aur AI ko data dene ke liye, sabse pehle apni Master CSV (Inventory List) file upload karein.
           </p>
           <button onClick={onGoToSettings} className="btn-primary" style={{ marginTop: '2rem', fontSize: '1.1rem', padding: '1rem 2rem', background: '#3B82F6', color: 'var(--text-main)', border: 'none' }}>Go to Account Settings ➔</button>
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '1.2rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
        <div className="ai-card" onClick={onTotalClick} style={{ flex: 1, minWidth: '200px', cursor: 'pointer', border: '1px solid var(--neon-accent)', background: 'rgba(16, 185, 129, 0.05)' }}>
           <h3 style={{ color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '2px' }}>Total Inventory</h3>
           <p style={{ fontSize: '2.5rem', margin: '0.5rem 0 0 0', fontWeight: '900', color: 'var(--neon-accent)' }}>{products.length}</p>
           <span style={{ fontSize: '0.6rem', color: 'var(--neon-accent)', fontWeight: 'bold' }}>[ VIEW ALL ITEMS ]</span>
        </div>
        
        <div className="ai-card" onClick={() => onAlertClick('lowStock')} style={{ flex: 1, minWidth: '200px', cursor: 'pointer', borderColor: lowStockCount > 0 ? 'var(--danger)' : 'var(--glass-border)', background: lowStockCount > 0 ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
           <h3 style={{ color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '2px' }}>Low Stock Filter</h3>
           <p style={{ fontSize: '2.5rem', margin: '0.5rem 0 0 0', fontWeight: '900', color: lowStockCount > 0 ? 'var(--danger)' : 'var(--text-main)' }}>{lowStockCount}</p>
           <span style={{ fontSize: '0.6rem', color: lowStockCount > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 'bold' }}>{lowStockCount > 0 ? '[ ALERT ACTIVE ]' : '[ STABLE ]'}</span>
        </div>
        
        {expKey && (
          <>
            <div className="ai-card" onClick={() => onAlertClick('expired')} style={{ flex: 1, minWidth: '200px', cursor: 'pointer', borderColor: expiredCount > 0 ? 'var(--danger)' : 'var(--glass-border)', background: expiredCount > 0 ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
              <h3 style={{ color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '2px' }}>Expired Items</h3>
              <p style={{ fontSize: '2.5rem', margin: '0.5rem 0 0 0', fontWeight: '900', color: 'var(--danger)' }}>{expiredCount}</p>
              <span style={{ fontSize: '0.6rem', color: 'var(--danger)', fontWeight: 'bold' }}>[ CRITICAL FILTER ]</span>
            </div>
            <div className="ai-card" onClick={() => onAlertClick('expiringSoon')} style={{ flex: 1, minWidth: '200px', cursor: 'pointer', borderColor: expiringSoonCount > 0 ? 'var(--warning)' : 'var(--glass-border)', background: expiringSoonCount > 0 ? 'rgba(245, 158, 11, 0.05)' : 'transparent' }}>
              <h3 style={{ color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '2px' }}>Expiring Soon</h3>
              <p style={{ fontSize: '2.5rem', margin: '0.5rem 0 0 0', fontWeight: '900', color: 'var(--warning)' }}>{expiringSoonCount}</p>
              <span style={{ fontSize: '0.6rem', color: 'var(--warning)', fontWeight: 'bold' }}>[ WARNING FILTER ]</span>
            </div>
          </>
        )}

        <div className="ai-card" style={{ flex: 1, minWidth: '200px' }}>
          <h3 style={{ color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '2px' }}>Total Stock</h3>
          <p style={{ fontSize: '2.5rem', margin: '0.5rem 0 0 0', fontWeight: '900', color: 'var(--neon-accent)' }}>{totalStock}</p>
        </div>
      </div>

      <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
          <div className="ai-card" style={{ textAlign: 'center' }}>
            <div className="scan-line"></div>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
            <h2 style={{ color: 'var(--neon-accent)' }}>Inbound</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Add products to stock via bill scanning.</p>
            <button className="btn-primary" onClick={() => onOpenScanner('IN')} style={{ width: '100%' }}>Scan Purchase Bill</button>
         </div>

         <div className="ai-card" style={{ textAlign: 'center' }}>
            <div className="scan-line" style={{animationDelay: '1.5s', background: 'var(--danger)', boxShadow: '0 0 15px var(--danger)'}}></div>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔥</div>
            <h2 style={{ color: 'var(--danger)' }}>Outbound</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Sell products via receipt deduction.</p>
            <button className="btn-primary" onClick={() => onOpenScanner('OUT')} style={{ width: '100%', borderColor: 'var(--danger)', color: 'var(--danger)' }}>Scan Sales Receipt</button>
         </div>
      </div>
    </div>
  );
}

function ScannerModal({ isOpen, onClose, scanType, userId, onScanSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setScanResult(null);
      setLoading(false);
    }
  }, [isOpen]);

  const processBill = async () => {
    if (!file) return;
    setLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
       const base64Str = event.target.result.split(',')[1];
       try {
         const res = await fetch('http://localhost:3000/products/scan-bill', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
             body: JSON.stringify({ 
                 fileName: file.name, 
                 fileType: file.type, 
                 base64Image: base64Str,
                 actionType: scanType 
             })
         });
         const data = await res.json();
         setScanResult(data);
         if(onScanSuccess) onScanSuccess(); 
       } catch (e) {
         console.error('Scan Error:', e);
         alert("AI server communication failed.");
       }
       setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
       <div className="glass-panel" style={{ padding: '3rem', width: '600px', maxWidth: '95%', border: '1px solid var(--glass-border)' }}>
          <button onClick={onClose} style={{ position:'absolute', top: 20, right: 25, background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '2rem', cursor: 'pointer' }}>×</button>
          
          <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--neon-accent)' }}>
             {scanType === 'IN' ? 'Inbound Scanner' : 'Outbound Scanner'}
          </h2>
          
          {!scanResult && !loading && (
             <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="ai-card" style={{ padding: '4rem', border: '2px dashed var(--glass-border)', textAlign: 'center', cursor: 'pointer' }}>
                   <input type="file" id="ai-file" onChange={(e) => setFile(e.target.files[0])} style={{ display: 'none' }} />
                   <label htmlFor="ai-file" style={{ cursor: 'pointer' }}>
                      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📁</div>
                      <div style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{file ? file.name : "Select Target Data"}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>SUPPORTED: PNG, JPG, PDF</div>
                   </label>
                </div>
                <button className="btn-primary" disabled={!file} onClick={processBill} style={{ padding: '1.4rem' }}>
                   Execute Neural Mapping
                </button>
             </div>
          )}

          {loading && (
             <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
               <div style={{ fontSize: '4rem', marginBottom: '1.5rem', animation: 'spin 2s linear infinite' }}>⚙️</div>
               <h3 className="glow-text">AI is mapping document...</h3>
             </div>
          )}

          {scanResult && !loading && (
             <div style={{ marginTop: '2rem' }}>
                {scanResult.success ? (
                   <div style={{ padding: '1.5rem', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', border: '1px solid var(--neon-accent)', textAlign: 'center' }}>
                      <h3 style={{ margin: 0, color: 'var(--neon-accent)' }}>SYNC_SUCCESS</h3>
                      <div style={{ fontSize: '0.8rem' }}>{scanResult.parsedItems?.length || 0} items mapped to registry.</div>
                   </div>
                ) : (
                   <div style={{ padding: '1.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', border: '1px solid var(--danger)', textAlign: 'center' }}>
                      <h3 style={{ margin: 0, color: 'var(--danger)' }}>SYNC_FAILED</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '0.5rem' }}>{scanResult.message || "Unknown AI error occurred."}</div>
                   </div>
                )}
                <button className="btn-primary" onClick={onClose} style={{ marginTop: '2rem', width: '100%' }}>Return to Command Center</button>
             </div>
          )}
       </div>
    </div>
  );
}

function AITools({ userId, onScanResult, onOpenScanner }) {
  return (
    <div style={{ padding: '2rem', flex: 1 }}>
      <h1 style={{ marginTop: 0, fontSize: '2.5rem' }}>Neural <span className="glow-text">Lab</span></h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Advanced autonomous protocols for zero-touch inventory.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginTop: '3rem' }}>
          <div className="ai-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🧬</div>
            <h2 style={{ color: 'var(--neon-accent)' }}>Inbound Sync</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Automated purchase mapping via Gemini AI.</p>
            <button className="btn-primary" onClick={() => onOpenScanner('IN')} style={{ width: '100%' }}>Scan Bill</button>
         </div>

         <div className="ai-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🩸</div>
            <h2 style={{ color: 'var(--danger)' }}>Outbound Sync</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Real-time stock deduction from receipts.</p>
            <button className="btn-primary" onClick={() => onOpenScanner('OUT')} style={{ width: '100%', borderColor: 'var(--danger)', color: 'var(--danger)' }}>Scan Receipt</button>
         </div>
      </div>
    </div>
  );
}

function Settings({ userId, onScanResult }) {
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("📂 File selected:", file.name);

    Papa.parse(file, {
      header: false,
      skipEmptyLines: 'greedy',
      encoding: "UTF-8",
      complete: async function(results) {
        console.log("📊 Raw Parse Results:", results.data);
        
        const rawRows = results.data;
        if (rawRows.length === 0) {
          alert("Error: File is empty!");
          return;
        }

        const firstRow = rawRows[0];
        let idIdx = -1, nameIdx = -1, qtyIdx = -1, priceIdx = -1;

        firstRow.forEach((val, i) => {
          const v = String(val).toLowerCase();
          if (v.includes('id') || v.includes('code') || v.includes('s.no') || v.includes('no.')) idIdx = i;
          if (v.includes('name') || v.includes('product') || v.includes('item')) nameIdx = i;
          if (v.includes('qty') || v.includes('stock')) qtyIdx = i;
          if (v.includes('mrp') || v.includes('price') || v.includes('rate')) priceIdx = i;
        });

        if (nameIdx === -1) nameIdx = 1;
        if (qtyIdx === -1) qtyIdx = 2;
        if (priceIdx === -1) priceIdx = 3;

        const headersMap = {
          productId: idIdx !== -1 && firstRow[idIdx] ? String(firstRow[idIdx]).trim() : 'Code',
          name: nameIdx !== -1 && firstRow[nameIdx] ? String(firstRow[nameIdx]).trim() : 'Item Name / Category',
          quantity: qtyIdx !== -1 && firstRow[qtyIdx] ? String(firstRow[qtyIdx]).trim() : 'Available Stock',
          mrp: priceIdx !== -1 && firstRow[priceIdx] ? String(firstRow[priceIdx]).trim() : 'MRP'
        };

        const mappedData = [];
        const startRow = 1; 

        for (let i = startRow; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length < 2) continue;

          const obj = {
            productId: row[idIdx] || '',
            name: row[nameIdx] || `Item-${i}`,
            quantity: row[qtyIdx] || '0',
            mrp: row[priceIdx] || '0',
            csv_row: i + 1,
            _timestamp: Date.now(),
            _headers: headersMap
          };

          row.forEach((cell, idx) => {
            if (![idIdx, nameIdx, qtyIdx, priceIdx].includes(idx)) {
              let colName = firstRow[idx] ? String(firstRow[idx]).trim() : `col_${idx}`;
              if (!colName) colName = `col_${idx}`;
              obj[colName] = cell;
            }
          });

          mappedData.push(obj);
        }

        console.log("✅ Mapped Data for Upload:", mappedData);
        alert(`ATTENTION: Found ${mappedData.length} valid rows. Sending to server...`);

        try {
          const res = await fetch('http://localhost:3000/products/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify(mappedData)
          });
          if (res.ok) {
            const finalData = await res.json();
            alert(`SUCCESS: ${finalData.count} items saved.`);
            onScanResult();
          } else {
            alert('Upload Error: Server rejected the data.');
          }
        } catch (err) {
          console.error(err);
          alert('Network Error.');
        }
      }
    });
  };

  const handleWipeCatalog = async () => {
    if(window.confirm("Kya aap sach me apna saara data delete karna chahte hain?")) {
        try {
            const res = await fetch('http://localhost:3000/products/all', { method: 'DELETE', headers: { 'x-user-id': userId } });
            if (res.ok) {
                alert('Aapka saara data delete ho gaya hai.');
                onScanResult();
            } else {
                alert('Error: Data delete nahi ho paya.');
            }
        } catch(e) {
            alert('Network Error');
        }
    }
  };

  return (
    <div style={{ padding: '2rem', flex: 1 }}>
      <h1 style={{ marginTop: 0, fontSize: '2.5rem' }}>Account <span className="glow-text">Settings</span></h1>
      <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px' }}>
          <div className="ai-card">
            <h3 style={{ margin: 0, color: 'var(--neon-accent)' }}>Upload CSV File</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Apni inventory (stock) list ko bulk me add karne ke liye CSV file select karein. Headers automatically map ho jayenge.</p>
            <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
            <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => fileInputRef.current.click()}>Select File</button>
         </div>

         <div className="ai-card" style={{ borderLeft: '4px solid var(--danger)' }}>
            <h3 style={{ margin: 0, color: 'var(--danger)' }}>Clear All Data</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Apne account ka saara inventory stock aur data hamesha ke liye delete karein.</p>
            <button className="btn-primary" onClick={handleWipeCatalog} style={{ marginTop: '1.5rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>Clear Data</button>
         </div>
      </div>
    </div>
  );
}

function Billing({ products, onSaleSuccess, userId }) {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
     if (searchTerm.trim().length > 0) {
        const filtered = products.filter(p => 
            p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.productId && p.productId.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setSearchResults(filtered);
     } else {
        setSearchResults([]);
     }
  }, [searchTerm, products]);

  const addToCart = (product) => {
     const exists = cart.find(item => item.id === product.id);
     if (exists) {
        setCart(cart.map(item => item.id === product.id ? {...item, quantity: item.quantity + 1} : item));
     } else {
        setCart([...cart, {...product, quantity: 1}]);
     }
     setSearchTerm('');
  };

  const updateQty = (id, delta) => {
     setCart(cart.map(item => item.id === id ? {...item, quantity: Math.max(1, item.quantity + delta)} : item));
  };

  const handleCheckout = async () => {
     if (cart.length === 0) return;
     try {
        const res = await fetch('http://localhost:3000/products/sell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify(cart.map(item => ({ id: item.id, quantity: item.quantity })))
        });
        if (res.ok) {
           setCart([]);
           onSaleSuccess();
        }
     } catch (e) {}
  };

  const totalAmount = cart.reduce((acc, item) => acc + (parseFloat(item.mrp || 0) * item.quantity), 0);

  return (
    <div style={{ padding: '2rem', flex: 1, display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
       <div style={{ flex: 2, minWidth: '400px' }}>
          <h1 style={{ marginTop: 0, fontSize: '2.5rem' }}>Sales <span className="glow-text">Terminal</span></h1>
          <div style={{ position: 'relative', marginTop: '1.5rem' }}>
             <input 
                type="text" 
                placeholder="Scan or Search Registry..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '1.4rem', background: 'var(--bg-card)', border: '1.5px solid var(--glass-border)', borderRadius: '16px', color: 'var(--text-main)', fontSize: '1.1rem', outline: 'none' }}
             />
             {searchResults.length > 0 && (
                <div className="search-results" style={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)' }}>
                   {searchResults.map(p => (
                      <div key={p.id} className="search-item" onClick={() => addToCart(p)}>
                         <div>
                            <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {p.productId || '---'}</div>
                         </div>
                         <div style={{ color: 'var(--neon-accent)', fontWeight: 'bold' }}>₹{p.mrp}</div>
                      </div>
                   ))}
                </div>
             )}
          </div>
       </div>

       <div className="glass-panel" style={{ flex: 1, minWidth: '350px', padding: '2rem' }}>
          <h2 style={{ marginTop: 0, color: 'var(--neon-accent)' }}>Payload Batch</h2>
          <div style={{ marginTop: '2rem' }}>
             {cart.map(item => (
                <div key={item.id} className="cart-card">
                   <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>₹{item.mrp}</div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button onClick={() => updateQty(item.id, -1)} className="btn-primary" style={{padding: '0.2rem 0.5rem'}}>-</button>
                      <span style={{fontWeight: 'bold'}}>{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="btn-primary" style={{padding: '0.2rem 0.5rem'}}>+</button>
                   </div>
                </div>
             ))}
          </div>

          <div style={{ borderTop: '1px solid var(--glass-border)', marginTop: '2rem', paddingTop: '1.5rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)' }}>
                <span>Total:</span>
                <span className="glow-text">₹{totalAmount}</span>
             </div>
             <button className="btn-primary" disabled={cart.length === 0} onClick={handleCheckout} style={{ width: '100%', marginTop: '2rem', padding: '1.2rem' }}>Confirm Terminal Sync</button>
          </div>
       </div>
    </div>
  );
}

function Inventory({ products, onAddProduct, onDeleteProduct, filterMode, setFilterMode }) {
  const [formData, setFormData] = useState({});

  const headers = useMemo(() => {
    const found = products.find(p => p._headers);
    if (found && found._headers) {
      return typeof found._headers === 'string' ? JSON.parse(found._headers) : found._headers;
    }
    return {
      productId: 'Code',
      name: 'Item Name / Category',
      quantity: 'Available Stock',
      mrp: 'MRP'
    };
  }, [products]);

  const dynamicColumns = useMemo(() => {
    const cols = new Set();
    products.forEach(p => Object.keys(p).forEach(k => {
      if (!['id', 'userId', 'quantity', 'mrp', 'productId', 'name', 'details', '_headers'].includes(k)) {
          cols.add(k);
      }
    }));
    return Array.from(cols);
  }, [products]);

  const displayProducts = useMemo(() => {
    if (filterMode === 'lowStock') return products.filter(p => parseInt(p.quantity || '0', 10) < 20);
    
    if (filterMode === 'expired' || filterMode === 'expiringSoon') {
      const expKey = getExpKey(dynamicColumns);
      if (!expKey) return products;

      return products.filter(p => {
        const info = getExpiryInfo(p[expKey]);
        return filterMode === 'expired' ? info.status === 'EXPIRED' : info.status === 'EXPIRING SOON';
      });
    }
    return products;
  }, [products, filterMode, dynamicColumns]);

  const isFiltered = filterMode && filterMode !== 'all';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    const payload = {
      _timestamp: Date.now(),
      ...formData
    };
    onAddProduct(payload);
    // Keep formData as is to retain default details for subsequent manual entries
  };

  const standardFields = [
    { key: 'productId', placeholder: headers.productId.toUpperCase(), flex: '1 1 120px' },
    { key: 'name', placeholder: headers.name.toUpperCase(), flex: '2 1 220px' },
    { key: 'quantity', placeholder: headers.quantity.toUpperCase(), flex: '1 1 100px' },
    { key: 'mrp', placeholder: headers.mrp.toUpperCase(), flex: '1 1 100px' },
    { key: 'details', placeholder: 'DETAILS', flex: '1 1 180px' },
  ];

  return (
    <div style={{ padding: '1rem', height: '100%', overflow: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
        <div>
           <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>Master <span className="glow-text">Inventory</span></h2>
           <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
             Showing <strong>{displayProducts.length}</strong> items • Filter: <span style={{ color: 'var(--neon-accent)', fontWeight: 'bold' }}>{filterMode.toUpperCase()}</span>
           </p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
           {isFiltered && (
             <button onClick={() => setFilterMode('all')} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer' }}>✕ RESET FILTER</button>
           )}
           <button 
             onClick={async () => {
               if(window.confirm("DANGER: This will delete ALL items from your account. Continue?")) {
                 await fetch('http://localhost:3000/products/all', { 
                   method: 'DELETE', 
                   headers: { 'x-user-id': localStorage.getItem('ant_user') } 
                 });
                 window.location.reload(); 
               }
             }}
             className="ai-card" 
             style={{ padding: '0.6rem 1.2rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderColor: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}
           >
             CLEAR ALL DATA
           </button>
           <button onClick={() => window.print()} className="ai-button" style={{ padding: '0.6rem 1.2rem', fontSize: '0.75rem' }}>PRINT REPORT</button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem' }}>
         <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>QUICK REGISTER</h4>
         <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
           {standardFields.map(f => (
             <input 
               key={f.key}
               type="text" 
               placeholder={f.placeholder} 
               value={formData[f.key] || ''} 
               onChange={e => setFormData({...formData, [f.key]: e.target.value})} 
               style={{ 
                 padding: '0.8rem', 
                 background: 'var(--bg-card)', 
                 color: 'var(--text-main)', 
                 border: '1px solid var(--glass-border)', 
                 borderRadius: '8px', 
                 minWidth: '100px',
                 flex: f.flex 
               }} 
             />
           ))}
           {dynamicColumns.filter(c => !['id', 'userId', 'name', 'quantity', 'mrp', 'csv_row', 'productId', 'details', '_timestamp', 'timestamp', '_headers'].includes(c.toLowerCase())).map(col => (
             <input 
               key={col}
               type="text" 
               placeholder={col.toUpperCase()} 
               value={formData[col] || ''} 
               onChange={e => setFormData({...formData, [col]: e.target.value})} 
               style={{ 
                 padding: '0.8rem', 
                 background: 'var(--bg-card)', 
                 color: 'var(--text-main)', 
                 border: '1px solid var(--glass-border)', 
                 borderRadius: '8px', 
                 minWidth: '140px',
                 flex: '1 1 140px' 
               }} 
             />
           ))}
           <button type="submit" className="btn-primary" style={{ padding: '0.8rem 2rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>ADD ITEM</button>
         </form>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', border: 'none', background: 'transparent', boxShadow: 'none' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead style={{ background: 'var(--bg-card)' }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '2px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>ROW</th>
                <th style={{ padding: '1rem', borderBottom: '2px solid var(--glass-border)', textTransform: 'uppercase' }}>{headers.name}</th>
                <th style={{ padding: '1rem', borderBottom: '2px solid var(--glass-border)', textTransform: 'uppercase' }}>{headers.quantity}</th>
                <th style={{ padding: '1rem', borderBottom: '2px solid var(--glass-border)', textTransform: 'uppercase' }}>{headers.mrp}</th>
                {dynamicColumns.filter(c => !['id', 'userId', 'name', 'quantity', 'mrp', 'csv_row', 'productId', '_headers'].includes(c)).map(col => (
                  <th key={col} style={{ padding: '1rem', borderBottom: '2px solid var(--glass-border)', textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{col}</th>
                ))}
                <th style={{ padding: '1rem', borderBottom: '2px solid var(--glass-border)', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayProducts.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--glass-border)', background: i % 2 === 0 ? 'transparent' : 'transparent' }}>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'monospace' }}>#{i + 1}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '1rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--neon-accent)', letterSpacing: '1px' }}>{headers.productId.toUpperCase()}: {p.productId || 'N/A'}</div>
                    {p.details && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{p.details}</div>}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ 
                      display: 'inline-block',
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '4px', 
                      background: parseInt(p.quantity) < 20 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: parseInt(p.quantity) < 20 ? 'var(--danger)' : 'var(--neon-accent)',
                      fontWeight: '900',
                      border: `1px solid ${parseInt(p.quantity) < 20 ? 'var(--danger)' : 'var(--neon-accent)'}`
                    }}>
                      {p.quantity}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-main)' }}>₹{p.mrp}</td>
                  {dynamicColumns.filter(c => !['id', 'userId', 'name', 'quantity', 'mrp', 'csv_row', 'productId', '_headers'].includes(c)).map(col => {
                    let displayVal = p[col];
                    if (col.toLowerCase().includes('timestamp') || col.toLowerCase().includes('time')) {
                      const ms = parseInt(displayVal, 10);
                      if (!isNaN(ms)) {
                        displayVal = new Date(ms).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
                      }
                    }
                    return (
                      <td key={col} style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{displayVal || '-'}</td>
                    );
                  })}
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button onClick={() => onDeleteProduct(p.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', cursor: 'pointer', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.7rem' }}>DELETE</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



function AntSupplyChain() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, hover: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Grid Construction
    const nodes = [];
    const gridSize = 3;
    const spacing = 60;
    
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          nodes.push({
            baseX: (x - 1) * spacing,
            baseY: (y - 1) * spacing,
            baseZ: (z - 1) * spacing,
            x: 0, y: 0, z: 0,
            glow: 0
          });
        }
      }
    }

    const links = [];
    nodes.forEach((n1, i) => {
      nodes.forEach((n2, j) => {
        if (i < j) {
          const dist = Math.sqrt(
            Math.pow(n1.baseX - n2.baseX, 2) +
            Math.pow(n1.baseY - n2.baseY, 2) +
            Math.pow(n1.baseZ - n2.baseZ, 2)
          );
          if (dist === spacing) links.push([i, j]);
        }
      });
    });

    // Ants & Data
    const ants = Array.from({ length: 8 }, () => {
      const linkIndex = Math.floor(Math.random() * links.length);
      return {
        linkIndex,
        progress: Math.random(),
        speed: 0.005 + Math.random() * 0.01,
        dir: 1
      };
    });

    const project = (node, scale, rotateY, rotateX) => {
      // Rotation
      let x = node.x * Math.cos(rotateY) - node.z * Math.sin(rotateY);
      let z = node.x * Math.sin(rotateY) + node.z * Math.cos(rotateY);
      let y = node.y * Math.cos(rotateX) - z * Math.sin(rotateX);
      z = node.y * Math.sin(rotateX) + z * Math.cos(rotateX);

      // Expansion/Contraction Logic
      const distToCenter = Math.sqrt(x*x + y*y + z*z);
      const expansion = mouseRef.current.hover ? 1.2 : 1.0;
      x *= expansion;
      y *= expansion;

      const fov = 400;
      const f = fov / (fov + z);
      return {
        px: canvas.width / 2 + x * f * scale,
        py: canvas.height / 2 + y * f * scale,
        visible: z > -fov
      };
    };

    let time = 0;
    const render = () => {
      time += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const rotateY = time * 0.2;
      const rotateX = time * 0.1;

      // Update node positions
      nodes.forEach(n => {
        n.x = n.baseX;
        n.y = n.baseY;
        n.z = n.baseZ;
        if (n.glow > 0) n.glow -= 0.05;
      });

      // Draw Paths
      ctx.lineWidth = 1;
      links.forEach(([i, j]) => {
        const p1 = project(nodes[i], 1, rotateY, rotateX);
        const p2 = project(nodes[j], 1, rotateY, rotateX);
        
        const grad = ctx.createLinearGradient(p1.px, p1.py, p2.px, p2.py);
        grad.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
        grad.addColorStop(0.5, 'rgba(139, 92, 246, 0.5)');
        grad.addColorStop(1, 'rgba(139, 92, 246, 0.2)');
        
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      });

      // Draw Ants & Data Packets
      ants.forEach(ant => {
        const [i, j] = links[ant.linkIndex];
        ant.progress += ant.speed;
        if (ant.progress >= 1) {
          ant.progress = 0;
          nodes[j].glow = 1;
          ant.linkIndex = Math.floor(Math.random() * links.length);
        }

        const n1 = nodes[i];
        const n2 = nodes[j];
        const ax = n1.x + (n2.x - n1.x) * ant.progress;
        const ay = n1.y + (n2.y - n1.y) * ant.progress;
        const az = n1.z + (n2.z - n1.z) * ant.progress;

        const p = project({ x: ax, y: ay, z: az }, 1, rotateY, rotateX);
        
        // Ant Symbolic Body (Geometric)
        ctx.fillStyle = '#A78BFA';
        ctx.beginPath();
        ctx.arc(p.px, p.py, 2, 0, Math.PI * 2);
        ctx.fill();

        // Data Packet (Neon Blue Glow)
        ctx.fillStyle = '#06B6D4';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#06B6D4';
        ctx.beginPath();
        ctx.arc(p.px, p.py - 5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Nodes
      nodes.forEach(n => {
        const p = project(n, 1, rotateY, rotateX);
        const r = 3 + n.glow * 4;
        ctx.fillStyle = n.glow > 0.5 ? '#06B6D4' : '#1E3A8A';
        ctx.shadowBlur = n.glow * 15;
        ctx.shadowColor = '#06B6D4';
        ctx.beginPath();
        ctx.arc(p.px, p.py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div 
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, hover: true };
      }}
      onMouseLeave={() => mouseRef.current.hover = false}
      style={{ width: '100%', height: '400px', background: '#020617', borderRadius: '24px', position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5)', border: '1px solid rgba(139, 92, 246, 0.2)' }}

    >
      <canvas ref={canvasRef} width={800} height={400} style={{ width: '100%', height: '100%' }} />

      <div style={{ position: 'absolute', bottom: 20, left: 20, color: 'rgba(139, 92, 246, 0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'monospace' }}>
        Live AI Core Sync // Warehouse_Matrix_Alpha
      </div>
    </div>
  );
}

// =====================================================================
// ABOUT PAGE v2 — THEME-AWARE + APPLE MOTION + SMART SCANNER
// =====================================================================

// Count-Up hook
function useCountUp(target, duration = 2000) {
  const [count, setCount] = React.useState(0);
  const [started, setStarted] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  React.useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);
  return [count, ref];
}

// ── Smart Warehouse Scanner Canvas ──────────────────────────────────
function SmartWarehouseScanner({ theme }) {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, t = 0;

    const setup = () => {
      canvas.width  = canvas.offsetWidth  || 900;
      canvas.height = canvas.offsetHeight || 280;
    };
    setup();

    const COLS = 12, ROWS = 4;
    const CYCLE = 380;

    // Each shelf item: random initial status
    const items = Array.from({ length: COLS * ROWS }, () => ({
      rawStatus: Math.random() < 0.22 ? 'expired'
               : Math.random() < 0.3  ? 'expiring'
               : 'healthy',
      revealed: 0,   // 0→1 as scanner passes
    }));

    const rr = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const STATUS_COLOR = { expired: '#EF4444', expiring: '#F59E0B', healthy: '#10B981' };
    const STATUS_LABEL = { expired: 'EXP', expiring: 'SOON', healthy: '✓ OK' };

    function draw() {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // BG
      const isDark = theme !== 'light';
      ctx.fillStyle = isDark ? '#020617' : '#f0f4ff';
      ctx.fillRect(0, 0, W, H);

      // Subtle grid
      ctx.strokeStyle = isDark ? 'rgba(6,182,212,0.04)' : 'rgba(59,130,246,0.06)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 50) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 50) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }

      // Scanner progress
      const phase  = (t % CYCLE) / CYCLE;          // 0→1 per cycle
      const scanX  = phase * W;
      const scanCol = Math.floor(phase * COLS);

      // Layout
      const padX = 24, padY = 36;
      const cellW = (W - padX * 2) / COLS;
      const cellH = (H - padY * 2) / ROWS;
      const gap   = 6;

      items.forEach((item, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x   = padX + col * cellW + gap / 2;
        const y   = padY + row * cellH + gap / 2;
        const w   = cellW - gap;
        const h   = cellH - gap;

        // Advance reveal for scanned cols
        if (col <= scanCol) {
          item.revealed = Math.min(1, item.revealed + 0.06);
        } else if (phase < 0.05) {
          item.revealed = Math.max(0, item.revealed - 0.06); // reset on new cycle
        }

        const p   = item.revealed;
        const col_c = STATUS_COLOR[item.rawStatus];

        // Box background
        if (p < 0.01) {
          // un-scanned: dim placeholder
          ctx.fillStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
          ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)';
          ctx.lineWidth = 0.5;
        } else {
          ctx.fillStyle = `${col_c}${Math.round(p * 30).toString(16).padStart(2,'0')}`;
          ctx.strokeStyle = `${col_c}${Math.round(p * 180).toString(16).padStart(2,'0')}`;
          ctx.lineWidth   = 1.2;
          ctx.shadowBlur  = 8 * p;
          ctx.shadowColor = col_c;
        }

        rr(x, y, w, h, 5);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Label
        ctx.font = `bold ${Math.round(7 + p * 4)}px monospace`;
        ctx.textAlign = 'center';
        if (p > 0.3) {
          ctx.fillStyle = `${col_c}${Math.round(p * 220).toString(16).padStart(2,'0')}`;
          ctx.fillText(STATUS_LABEL[item.rawStatus], x + w / 2, y + h / 2 + 4);
        } else {
          ctx.fillStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
          ctx.fillText('···', x + w / 2, y + h / 2 + 4);
        }
      });

      // Scanner beam glow
      const bg1 = ctx.createLinearGradient(scanX - 40, 0, scanX + 40, 0);
      bg1.addColorStop(0, 'rgba(6,182,212,0)');
      bg1.addColorStop(0.5, 'rgba(6,182,212,0.18)');
      bg1.addColorStop(1, 'rgba(6,182,212,0)');
      ctx.fillStyle = bg1;
      ctx.fillRect(scanX - 40, 0, 80, H);

      // Scanner line
      ctx.save();
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth   = 2;
      ctx.shadowBlur  = 18;
      ctx.shadowColor = '#06B6D4';
      ctx.beginPath();
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, H);
      ctx.stroke();
      ctx.restore();

      // Ant X badge riding scanner
      ctx.save();
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🐜', scanX, 20);
      ctx.restore();

      // Top-left label
      ctx.fillStyle = isDark ? 'rgba(6,182,212,0.55)' : 'rgba(59,130,246,0.7)';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('ANT X — SCANNING WAREHOUSE', padX, 18);

      // Live stats top-right
      const scanned  = items.filter(item => item.revealed > 0.5);
      const expCount = scanned.filter(item => item.rawStatus === 'expired').length;
      const okCount  = scanned.filter(item => item.rawStatus === 'healthy').length;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#EF4444';
      ctx.fillText(`EXPIRED FOUND: ${expCount}`, W - padX, 18);
      ctx.fillStyle = '#10B981';
      ctx.fillText(`HEALTHY: ${okCount}`, W - padX, 30);

      t++;
      animId = requestAnimationFrame(draw);
    }

    draw();
    const ro = new ResizeObserver(setup);
    ro.observe(canvas);
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%', height: '280px', display: 'block',
        borderRadius: '16px',
        border: `1px solid ${theme === 'light' ? 'rgba(59,130,246,0.15)' : 'rgba(6,182,212,0.12)'}`,
      }}
    />
  );
}

// ── Scroll-Story Section (Apple Vision Pro style) ───────────────────
const STORY_SCENES = [
  {
    tag: 'THE PROBLEM',
    lines: ['Manual chaos.', 'Invisible losses.', 'Expiry ignored.'],
    body: 'Every warehouse manager knows the pain. Spreadsheets, sticky notes, and guesswork — while lakhs in expired products silently drain revenue.',
    color: '#EF4444',
    icon: '😰',
    stat: { num: '₹2.5L', label: 'lost per month on avg to expiry' },
  },
  {
    tag: 'ANT X SEES ALL',
    lines: ['Every item.', 'Every batch date.', 'Real-time clarity.'],
    body: 'Inventory Ant\'s AI scans your entire shelf in seconds. Every product, every batch, every expiry — visible at a glance. No item is invisible anymore.',
    color: '#06B6D4',
    icon: '🔍',
    stat: { num: '99%', label: 'item tracking accuracy' },
  },
  {
    tag: 'INSTANT COMMAND',
    lines: ['"10 boxes add karo."', 'Done.', 'Zero typing.'],
    body: 'Just speak. Ant X hears your voice, matches the item intelligently, updates the stock matrix instantly. Your warehouse obeys you, not the other way.',
    color: '#8B5CF6',
    icon: '🎙️',
    stat: { num: '85%', label: 'faster than manual entry' },
  },
  {
    tag: 'ZERO WASTE',
    lines: ['No expired items.', 'No silent losses.', 'Pure efficiency.'],
    body: 'The result: a warehouse where nothing expires quietly. Every rupee is protected. Every product is tracked. Every batch is moved before it\'s too late.',
    color: '#10B981',
    icon: '🏆',
    stat: { num: '40%', label: 'reduction in expiry loss' },
  },
];

function ScrollStorySection({ scrollContainerRef }) {
  const sectionRef  = React.useRef(null);
  const [scene, setScene] = React.useState(0);
  const [fade,  setFade]  = React.useState(true);

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handler = () => {
      const section = sectionRef.current;
      if (!section) return;
      const sTop   = section.offsetTop;
      const sH     = section.offsetHeight;
      const scroll = container.scrollTop;
      const vH     = container.clientHeight;

      // progress through the sticky scroll zone (0→1)
      const raw  = (scroll - sTop + vH * 0.3) / (sH - vH);
      const prog = Math.max(0, Math.min(0.999, raw));
      const next = Math.min(3, Math.floor(prog * 4));

      setScene(prev => {
        if (prev !== next) { setFade(false); setTimeout(() => setFade(true), 50); }
        return next;
      });
    };

    container.addEventListener('scroll', handler, { passive: true });
    return () => container.removeEventListener('scroll', handler);
  }, [scrollContainerRef]);

  const s    = STORY_SCENES[scene];
  const isDark = true; // story section always dark for cinematic feel

  return (
    <div ref={sectionRef} style={{ height: '420vh', position: 'relative' }}>
      {/* Sticky panel */}
      <div style={{
        position: 'sticky', top: 0, height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #020617 0%, #0a0f2e 100%)',
        overflow: 'hidden',
      }}>

        {/* Animated BG blob */}
        <div style={{
          position: 'absolute', width: '600px', height: '600px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${s.color}12, transparent 70%)`,
          transition: 'background 0.8s ease',
          pointerEvents: 'none',
        }} />

        {/* Subtle grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(${s.color}08 1px, transparent 1px), linear-gradient(90deg, ${s.color}08 1px, transparent 1px)`,
          backgroundSize: '70px 70px',
          transition: 'background-image 0.8s',
        }} />

        {/* Scene counter dots */}
        <div style={{ position: 'absolute', right: '2.5rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {STORY_SCENES.map((sc, i) => (
            <div key={i} style={{
              width: scene === i ? '28px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: scene === i ? sc.color : 'rgba(255,255,255,0.15)',
              transition: 'all 0.4s ease',
            }} />
          ))}
        </div>

        {/* Main content */}
        <div style={{
          maxWidth: '900px', width: '90%', zIndex: 2,
          opacity: fade ? 1 : 0,
          transform: fade ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {/* Tag */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '5px 16px', borderRadius: '999px',
            border: `1px solid ${s.color}40`,
            background: `${s.color}10`,
            color: s.color, fontSize: '0.68rem', letterSpacing: '4px', fontWeight: '800',
            marginBottom: '2.5rem',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, animation: 'abt_pulse 1.5s infinite' }} />
            {s.tag}
          </div>

          {/* Headline lines — one by one, staggered */}
          <div style={{ marginBottom: '2.5rem' }}>
            {s.lines.map((line, li) => (
              <div key={`${scene}-${li}`} style={{
                fontSize: 'clamp(2.5rem, 6vw, 5.5rem)',
                fontWeight: '900',
                lineHeight: '1.08',
                letterSpacing: '-2.5px',
                color: li === s.lines.length - 1 ? s.color : '#ffffff',
                opacity: 0,
                transform: 'translateY(40px)',
                animation: `abt_lineIn 0.7s cubic-bezier(0.16,1,0.3,1) ${li * 0.12}s forwards`,
              }}>
                {line}
              </div>
            ))}
          </div>

          {/* Body text */}
          <p style={{
            color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(1rem, 1.8vw, 1.2rem)',
            lineHeight: '1.8', maxWidth: '620px', marginBottom: '2.5rem',
            opacity: 0, animation: 'abt_lineIn 0.7s ease 0.4s forwards',
          }}>
            {s.body}
          </p>

          {/* Stat badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '1.5rem',
            padding: '1rem 2rem', borderRadius: '16px',
            border: `1px solid ${s.color}30`,
            background: `${s.color}08`,
            opacity: 0, animation: 'abt_lineIn 0.7s ease 0.55s forwards',
          }}>
            <span style={{ fontSize: '2.2rem', fontWeight: '900', color: s.color, fontFamily: 'monospace' }}>
              {s.stat.num}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', maxWidth: '160px', lineHeight: '1.4' }}>
              {s.stat.label}
            </span>
          </div>
        </div>

        {/* Huge background icon */}
        <div style={{
          position: 'absolute', right: '-2rem', bottom: '-2rem',
          fontSize: 'clamp(10rem, 20vw, 18rem)',
          opacity: 0.04,
          pointerEvents: 'none',
          userSelect: 'none',
          transition: 'all 0.6s ease',
          filter: 'grayscale(1)',
        }}>
          {s.icon}
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', opacity: 0.35 }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '3px', color: s.color, marginBottom: '6px' }}>SCROLL</div>
          <div style={{ width: '1px', height: '36px', background: `linear-gradient(${s.color}, transparent)`, margin: '0 auto' }} />
        </div>

      </div>

      {/* Animations */}
      <style>{`
        @keyframes abt_lineIn { to { opacity: 1; transform: translateY(0); } }
        @keyframes abt_pulse  { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.4)} }
        @keyframes abt_float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
        @keyframes abt_spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes abt_glow   { 0%,100%{box-shadow:0 0 20px var(--gc,#06B6D4)} 50%{box-shadow:0 0 50px var(--gc,#06B6D4)} }
        @keyframes abt_slideUp{ from{opacity:0;transform:translateY(50px)} to{opacity:1;transform:translateY(0)} }
        .abt-reveal { opacity:0; transform:translateY(40px); transition:opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1); }
        .abt-reveal.visible { opacity:1; transform:translateY(0); }
        .abt-card { transition: transform 0.35s ease, box-shadow 0.35s ease; }
        .abt-card:hover { transform: translateY(-8px) scale(1.015); }
        .abt-stat { transition: transform 0.3s ease; }
        .abt-stat:hover { transform: scale(1.06); }
      `}</style>
    </div>
  );
}

// ── Main About Component ─────────────────────────────────────────────
function About({ theme }) {
  const scrollRef   = React.useRef(null);
  const heroRef     = React.useRef(null);
  const [heroVis,   setHeroVis]   = React.useState(false);
  const [pillarsVis,setPillarsVis]= React.useState(false);
  const [missionVis,setMissionVis]= React.useState(false);
  const pillarsRef  = React.useRef(null);
  const missionRef  = React.useRef(null);

  const [stat1, stat1Ref] = useCountUp(40, 2200);
  const [stat2, stat2Ref] = useCountUp(85, 2000);
  const [stat3, stat3Ref] = useCountUp(99, 1800);

  React.useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setHeroVis(true); }, { root: container, threshold: 0.1 });
    const obs2 = new IntersectionObserver(([e]) => { if (e.isIntersecting) setPillarsVis(true); }, { root: container, threshold: 0.1 });
    const obs3 = new IntersectionObserver(([e]) => { if (e.isIntersecting) setMissionVis(true); }, { root: container, threshold: 0.1 });
    if (heroRef.current)    obs.observe(heroRef.current);
    if (pillarsRef.current) obs2.observe(pillarsRef.current);
    if (missionRef.current) obs3.observe(missionRef.current);
    return () => { obs.disconnect(); obs2.disconnect(); obs3.disconnect(); };
  }, []);

  const dark = theme !== 'light';

  // Theme token shorthand
  const T = {
    bg:       dark ? '#020617'                   : '#ffffff',
    bgSub:    dark ? 'rgba(255,255,255,0.01)'    : 'rgba(0,0,0,0.015)',
    bgCard:   dark ? 'rgba(255,255,255,0.02)'    : 'rgba(0,0,0,0.02)',
    border:   dark ? 'rgba(255,255,255,0.06)'    : 'rgba(0,0,0,0.08)',
    text:     dark ? '#ffffff'                   : '#0f172a',
    textMid:  dark ? 'rgba(255,255,255,0.55)'    : 'rgba(15,23,42,0.6)',
    textDim:  dark ? 'rgba(255,255,255,0.3)'     : 'rgba(15,23,42,0.35)',
    accent:   '#06B6D4',
    grid:     dark ? 'rgba(6,182,212,0.03)'      : 'rgba(59,130,246,0.04)',
  };

  const pillars = [
    { icon:'📦', tag:'INBOUND',       title:'Scan. Extract. Done.',   desc:'Scan any purchase bill — AI reads item codes, quantities, and batch dates instantly. Zero manual typing.',  color:'#3B82F6' },
    { icon:'🚚', tag:'OUTBOUND',      title:'Sell. Sync. Move.',       desc:'Billing auto-deducts from live stock matrix. No over-selling. No stockouts. Pure flow.',                   color:'#8B5CF6' },
    { icon:'⏳', tag:'EXPIRY GUARD',  title:'Guard Before Loss.',      desc:'AI monitors every batch expiry months ahead. Move stock before the loss — not after.',                      color:'#F59E0B' },
    { icon:'🎙️', tag:'VOICE CONTROL', title:'Speak. It Happens.',     desc:'"10 pieces add karo" — Ant X hears you, executes instantly, confirms aloud. Hands-free warehouse.',         color:'#10B981' },
  ];

  return (
    <div
      ref={scrollRef}
      style={{ flex:1, overflowY:'auto', overflowX:'hidden', background: T.bg, fontFamily:"'Inter',system-ui,sans-serif", transition:'background 0.4s ease' }}
    >

      {/* ═══ HERO ═══════════════════════════════════════════════════ */}
      <div
        ref={heroRef}
        style={{
          minHeight: '100vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
          padding: '6rem 2rem 5rem',
          background: dark
            ? 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.06) 0%, transparent 50%), #020617'
            : 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.06) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.04) 0%, transparent 50%), #ffffff',
        }}
      >
        {/* Grid BG */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage:`linear-gradient(${T.grid} 1px,transparent 1px),linear-gradient(90deg,${T.grid} 1px,transparent 1px)`,
          backgroundSize:'64px 64px' }} />

        {/* Orbs */}
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%',
          background: dark ? 'radial-gradient(circle,rgba(59,130,246,0.09) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 70%)',
          top:-120, left:-100, pointerEvents:'none', animation:'abt_float 7s ease-in-out infinite' }} />
        <div style={{ position:'absolute', width:380, height:380, borderRadius:'50%',
          background: dark ? 'radial-gradient(circle,rgba(6,182,212,0.07) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(6,182,212,0.05) 0%,transparent 70%)',
          bottom:-80, right:-60, pointerEvents:'none', animation:'abt_float 9s ease-in-out infinite 3s' }} />

        {/* Badge */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:8,
          padding:'6px 18px', borderRadius:999,
          border:`1px solid ${dark ? 'rgba(6,182,212,0.3)' : 'rgba(59,130,246,0.3)'}`,
          background: dark ? 'rgba(6,182,212,0.06)' : 'rgba(59,130,246,0.05)',
          color: dark ? '#06B6D4' : '#3B82F6',
          fontSize:'0.7rem', letterSpacing:'4px', fontWeight:700,
          marginBottom:'2rem',
          opacity: heroVis ? 1 : 0, transition:'opacity 1s ease 0.2s',
        }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background: dark ? '#06B6D4' : '#3B82F6', animation:'abt_pulse 2s infinite' }} />
          INVENTORY ANT — B2B WAREHOUSE INTELLIGENCE
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize:'clamp(3rem,7vw,6.5rem)', fontWeight:900, textAlign:'center',
          lineHeight:1.05, letterSpacing:'-3px', margin:'0 0 1.5rem', maxWidth:860,
          color: T.text,
          opacity: heroVis ? 1 : 0, transform: heroVis ? 'translateY(0)' : 'translateY(50px)',
          transition:'opacity 1s cubic-bezier(0.16,1,0.3,1) 0.35s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.35s',
        }}>
          Your Warehouse.{' '}
          <span style={{
            background:'linear-gradient(135deg,#06B6D4,#3B82F6,#8B5CF6)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
          }}>Simplified.</span>
        </h1>

        {/* Sub */}
        <p style={{
          color: T.textMid, fontSize:'clamp(1rem,2vw,1.3rem)',
          maxWidth:580, textAlign:'center', lineHeight:1.75, marginBottom:'3.5rem',
          opacity: heroVis ? 1 : 0, transform: heroVis ? 'translateY(0)' : 'translateY(40px)',
          transition:'opacity 1s ease 0.5s, transform 1s ease 0.5s',
        }}>
          We don't just track inventory. We give warehouse managers the clarity, speed,
          and intelligence they've never had before — powered entirely by AI.
        </p>

        {/* Floating ant */}
        <div style={{
          fontSize:'5.5rem',
          animation:'abt_float 5s ease-in-out infinite',
          filter: dark ? 'drop-shadow(0 0 28px rgba(6,182,212,0.45))' : 'drop-shadow(0 4px 16px rgba(59,130,246,0.3))',
          marginBottom:'2rem',
          opacity: heroVis ? 1 : 0, transition:'opacity 1s ease 0.65s',
        }}>🐜</div>

        {/* Scroll indicator */}
        <div style={{ position:'absolute', bottom:'2rem', left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:6, opacity:0.4 }}>
          <span style={{ fontSize:'0.6rem', letterSpacing:'3px', color: T.accent }}>SCROLL</span>
          <div style={{ width:1, height:38, background:`linear-gradient(${T.accent},transparent)` }} />
        </div>
      </div>

      {/* ═══ SCANNER CANVAS ═════════════════════════════════════════ */}
      <div style={{ padding:'5rem 2rem', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
          <p style={{ color: dark ? 'rgba(6,182,212,0.6)' : 'rgba(59,130,246,0.7)', fontSize:'0.72rem', letterSpacing:'4px', textTransform:'uppercase', marginBottom:'1rem' }}>
            Live Intelligence
          </p>
          <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.8rem)', color: T.text, fontWeight:800, margin:0, letterSpacing:'-1px' }}>
            Ant X scans your{' '}
            <span style={{ color: T.accent }}>entire warehouse</span>
          </h2>
          <p style={{ color: T.textMid, marginTop:'0.75rem', fontSize:'1rem', maxWidth:500, margin:'0.75rem auto 0' }}>
            Watch how every product gets identified, categorised, and protected in real-time
          </p>
        </div>
        <SmartWarehouseScanner theme={theme} />
      </div>

      {/* ═══ SCROLL STORY (Apple Vision Pro motion) ═════════════════ */}
      <ScrollStorySection scrollContainerRef={scrollRef} />

      {/* ═══ STATS ══════════════════════════════════════════════════ */}
      <div style={{ padding:'5rem 2rem', background: T.bgSub, borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1.5rem' }}>
          {[
            { r: stat1Ref, val: stat1, suf:'%', label:'Less Expiry Loss',   desc:'Average after 30 days with Ant', color:'#06B6D4' },
            { r: stat2Ref, val: stat2, suf:'%', label:'Faster Stock Ops',   desc:'vs. manual spreadsheet entry',   color:'#8B5CF6' },
            { r: stat3Ref, val: stat3, suf:'%', label:'Accuracy Rate',       desc:'AI-powered item matching',       color:'#10B981' },
          ].map((s, i) => (
            <div key={i} ref={s.r} className="abt-stat" style={{
              textAlign:'center', padding:'2.5rem 1.5rem',
              border:`1px solid ${s.color}20`, borderRadius:20,
              background: dark ? `radial-gradient(circle at 50% 0%,${s.color}08,transparent 70%)` : `radial-gradient(circle at 50% 0%,${s.color}06,transparent 70%)`,
            }}>
              <div style={{
                fontSize:'3.5rem', fontWeight:900, lineHeight:1,
                background:`linear-gradient(135deg,${s.color},${dark ? '#ffffff' : '#0f172a'})`,
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                marginBottom:'0.75rem',
              }}>{s.val}{s.suf}</div>
              <div style={{ color: T.text, fontWeight:700, fontSize:'1.05rem', marginBottom:'0.3rem' }}>{s.label}</div>
              <div style={{ color: T.textDim, fontSize:'0.8rem' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 4 PILLARS ══════════════════════════════════════════════ */}
      <div
        ref={pillarsRef}
        className={`abt-reveal${pillarsVis ? ' visible' : ''}`}
        style={{ padding:'6rem 2rem', maxWidth:1200, margin:'0 auto' }}
      >
        <div style={{ textAlign:'center', marginBottom:'3.5rem' }}>
          <p style={{ color: dark ? 'rgba(6,182,212,0.6)' : 'rgba(59,130,246,0.65)', fontSize:'0.72rem', letterSpacing:'4px', textTransform:'uppercase', marginBottom:'1rem' }}>How We Do It</p>
          <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.8rem)', color: T.text, fontWeight:800, margin:0, letterSpacing:'-1px' }}>
            Four pillars of <span style={{ color: T.accent }}>zero-waste ops</span>
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:'1.25rem' }}>
          {pillars.map((p, i) => (
            <div key={i} className="abt-card" style={{
              padding:'2.5rem 2rem', borderRadius:22,
              border:`1px solid ${p.color}20`,
              background: dark
                ? `radial-gradient(circle at 30% 0%,${p.color}08,transparent 60%), rgba(255,255,255,0.01)`
                : `radial-gradient(circle at 30% 0%,${p.color}05,transparent 60%), rgba(0,0,0,0.01)`,
              position:'relative', overflow:'hidden',
            }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${p.color},transparent)` }} />
              <div style={{ fontSize:'2.2rem', marginBottom:'1rem' }}>{p.icon}</div>
              <div style={{ fontSize:'0.62rem', letterSpacing:'3px', color: p.color, fontWeight:800, marginBottom:'0.4rem', textTransform:'uppercase' }}>{p.tag}</div>
              <h3 style={{ color: T.text, fontSize:'1.2rem', fontWeight:700, margin:'0 0 0.65rem', lineHeight:1.2 }}>{p.title}</h3>
              <p style={{ color: T.textMid, fontSize:'0.88rem', lineHeight:1.7, margin:0 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ANT X FEATURE ROW ══════════════════════════════════════ */}
      <div style={{ padding:'7rem 2rem', background: dark ? 'linear-gradient(180deg,#020617 0%,rgba(6,78,59,0.12) 50%,#020617 100%)' : 'linear-gradient(180deg,#ffffff 0%,rgba(16,185,129,0.04) 50%,#ffffff 100%)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', gap:'5rem', alignItems:'center', flexWrap:'wrap' }}>

          {/* Orb */}
          <div style={{ flex:'0 0 auto', width:260, height:260, margin:'0 auto', position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{
              width:200, height:200, borderRadius:'50%',
              background:'radial-gradient(circle,rgba(16,185,129,0.15) 0%,transparent 70%)',
              border:'1px solid rgba(16,185,129,0.3)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'6rem',
              boxShadow:'0 0 60px rgba(16,185,129,0.12)',
              animation:'abt_glow 4s ease-in-out infinite',
            }}>
              <div style={{ animation:'abt_float 5s ease-in-out infinite' }}>🐜</div>
            </div>
            {[1.3, 1.65].map((sc, i) => (
              <div key={i} style={{
                position:'absolute',
                width:`${sc * 200}px`, height:`${sc * 200}px`,
                borderRadius:'50%',
                border:`1px solid rgba(16,185,129,${0.12 - i * 0.04})`,
                animation:`abt_spin ${15 + i * 10}s linear ${i % 2 ? 'reverse' : ''} infinite`,
              }} />
            ))}
            {[{label:'Voice AI',angle:0,c:'#10B981'},{label:'Expiry Guard',angle:120,c:'#F59E0B'},{label:'Smart Match',angle:240,c:'#06B6D4'}].map((tag, i) => {
              const rad = tag.angle * Math.PI / 180;
              return (
                <div key={i} style={{
                  position:'absolute',
                  top:`calc(50% + ${Math.sin(rad)*130}px)`,
                  left:`calc(50% + ${Math.cos(rad)*130}px)`,
                  transform:'translate(-50%,-50%)',
                  padding:'3px 10px', borderRadius:999,
                  background:`${tag.c}15`, border:`1px solid ${tag.c}40`,
                  color: tag.c, fontSize:'0.6rem', fontWeight:700, whiteSpace:'nowrap', letterSpacing:'1px',
                }}>{tag.label}</div>
              );
            })}
          </div>

          {/* Copy */}
          <div style={{ flex:1, minWidth:280 }}>
            <p style={{ color:'rgba(16,185,129,0.6)', fontSize:'0.7rem', letterSpacing:'4px', textTransform:'uppercase', marginBottom:'1rem' }}>AI AGENT</p>
            <h2 style={{ fontSize:'clamp(2rem,4vw,3.2rem)', color: T.text, fontWeight:900, margin:'0 0 1.25rem', lineHeight:1.1, letterSpacing:'-1.5px' }}>
              Meet <span style={{ color:'#10B981' }}>Ant X</span> —<br />your warehouse brain.
            </h2>
            <p style={{ color: T.textMid, fontSize:'1.05rem', lineHeight:1.8, marginBottom:'2rem' }}>
              Ant X doesn't just answer questions — she acts. Voice commands, smart matching,
              expiry alerts, instant stock updates. One AI that runs your warehouse 24/7.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
              {[
                { cmd:'"10 boxes add karo"',   res:'Stock updated via voice',        c:'#10B981' },
                { cmd:'Batch date scanned',     res:'Expiry alert auto-scheduled',    c:'#F59E0B' },
                { cmd:'Item name mismatch',     res:'Smart match prevents duplicate', c:'#06B6D4' },
              ].map((row, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:'1rem',
                  padding:'0.9rem 1.25rem', borderRadius:12,
                  border:`1px solid ${T.border}`,
                  background: T.bgCard,
                }}>
                  <div style={{ flex:1, color: T.textDim, fontSize:'0.88rem', fontFamily:'monospace' }}>→ {row.cmd}</div>
                  <div style={{ width:1, height:18, background: T.border }} />
                  <div style={{ flex:1, color: row.c, fontSize:'0.82rem', fontWeight:700 }}>✓ {row.res}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ VISION CLOSING ═════════════════════════════════════════ */}
      <div
        ref={missionRef}
        className={`abt-reveal${missionVis ? ' visible' : ''}`}
        style={{ padding:'8rem 2rem', textAlign:'center', position:'relative', overflow:'hidden',
          background: dark ? '#020617' : '#ffffff' }}
      >
        {/* Watermark */}
        <div style={{
          position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'clamp(8rem,20vw,18rem)', fontWeight:900,
          color: dark ? 'rgba(6,182,212,0.025)' : 'rgba(59,130,246,0.04)',
          letterSpacing:'-10px', pointerEvents:'none', userSelect:'none',
        }}>ANT</div>

        <div style={{ position:'relative', maxWidth:700, margin:'0 auto' }}>
          <p style={{ color: dark ? 'rgba(6,182,212,0.6)' : 'rgba(59,130,246,0.65)', fontSize:'0.72rem', letterSpacing:'4px', textTransform:'uppercase', marginBottom:'2rem' }}>
            Our Vision
          </p>
          <blockquote style={{
            fontSize:'clamp(1.5rem,3.5vw,2.4rem)', fontWeight:800,
            color: T.text, lineHeight:1.45, margin:'0 0 2.5rem', letterSpacing:'-0.5px',
          }}>
            "A world where{' '}
            <span style={{ color: T.accent }}>zero products</span>
            {' '}expire in a warehouse —<br />
            because every item has a{' '}
            <span style={{ color:'#10B981' }}>guardian.</span>"
          </blockquote>
          <p style={{ color: T.textMid, fontSize:'1rem', lineHeight:1.8, marginBottom:'3rem' }}>
            Inventory Ant is not a feature. It is a mission — to end the silent thief of
            the FMCG and Beauty industry: expiry loss. We are the guardian between your products and waste.
          </p>
          <div style={{ display:'inline-flex', alignItems:'center', gap:12, opacity:0.4 }}>
            <div style={{ width:40, height:1, background: T.accent + '80' }} />
            <span style={{ fontSize:'0.62rem', letterSpacing:'4px', color: T.accent }}>INVENTORY ANT // ZERO WASTE PROTOCOL</span>
            <div style={{ width:40, height:1, background: T.accent + '80' }} />
          </div>
        </div>
      </div>

    </div>
  );
}


function AntAgent({ userId, onUpdate }) {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [manualText, setManualText] = useState('');
  const [showInput, setShowInput] = useState(false);
  
  // Use Ref to ensure we always have the latest value in closures
  const continuousRef = useRef(false);
  const [isContinuousUI, setIsContinuousUI] = useState(false);

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    // Strict Filtering: Whitelist Female names + Blacklist Male names
    const femaleVoice = voices.find(v => 
      v.lang.startsWith('hi') && 
      (v.name.toLowerCase().includes('female') || 
       v.name.toLowerCase().includes('hemlata') || 
       v.name.toLowerCase().includes('kalpana') || 
       v.name.toLowerCase().includes('swara') || 
       v.name.toLowerCase().includes('sangeeta') || 
       v.name.toLowerCase().includes('vaani') ||
       v.name.toLowerCase().includes('google hindi')) &&
      !v.name.toLowerCase().includes('male') &&
      !v.name.toLowerCase().includes('ravi')
    );

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    } else {
      // Fallback: If no Hindi female voice, try any Female voice to avoid Boy voice
      const anyFemale = voices.find(v => v.name.toLowerCase().includes('female') && !v.name.toLowerCase().includes('male'));
      if (anyFemale) utterance.voice = anyFemale;
    }

    utterance.onend = () => {
      console.log("Speech finished. Continuous:", continuousRef.current);
      if (continuousRef.current) {
        setTimeout(() => startListening(true), 500);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleCommand = async (text) => {
    if (!text) return;
    setStatus('Processing...');
    try {
      const res = await fetch('http://localhost:3000/products/agent-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data.success) {
        setAiResponse(data.message);
        speak(data.message);
        if (onUpdate) onUpdate();
      } else {
        setAiResponse(data.message);
        if(continuousRef.current) setTimeout(() => startListening(true), 1000);
      }
    } catch (err) {
      setAiResponse("Connection error.");
      if(continuousRef.current) setTimeout(() => startListening(true), 1000);
    }
    setStatus('');
    setManualText('');
  };

  const startListening = (auto = false) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setShowInput(true);
      return;
    }

    if (!auto) {
      continuousRef.current = !continuousRef.current;
      setIsContinuousUI(continuousRef.current);
    }

    if (!continuousRef.current && auto) return; // Guard

    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; 
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => { 
      setIsListening(true); 
      setStatus('Listening👂...'); 
      setTranscript('');
      setAiResponse(''); 
    };

    let processingDone = false;
    recognition.onresult = (event) => {
      let draft = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        draft += event.results[i][0].transcript;
      }
      setTranscript(draft);

      if (event.results[0].isFinal && !processingDone) {
        processingDone = true;
        handleCommand(draft);
      }
    };

    recognition.onerror = (e) => { 
      console.error("Mic Error:", e.error);
      setIsListening(false);
      if (continuousRef.current) {
        setStatus('Retrying...');
        setTimeout(() => startListening(true), 1500);
      } else {
        setStatus('Mic Error: ' + e.error);
      }
    };
  };

  return (
    <div style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem' }}>
      
      {/* Interaction Bubble */}
      {(status || aiResponse || transcript || showInput) && (
        <div className="glass-panel" style={{ 
          background: 'var(--glass-bg)', 
          padding: '1.2rem', 
          borderRadius: '24px', 
          width: '320px', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          borderBottomRightRadius: '4px',
          border: '1px solid var(--glass-border)',
          animation: 'slideUp 0.3s ease'
        }}>
          {isContinuousUI && <div style={{ fontSize: '0.65rem', color: 'var(--neon-accent)', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 6, height: 6, background: 'var(--neon-accent)', borderRadius: '50%', boxShadow: '0 0 10px var(--neon-accent)' }}></span> Hands-Free Mode Active
          </div>}

          {transcript && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontStyle: 'italic' }}>" {transcript} "</div>}
          
          <div style={{ fontWeight: '600', color: status ? 'var(--neon-accent)' : 'var(--text-main)', fontSize: '1.05rem', lineHeight: '1.4' }}>
            {status || aiResponse || "Aapki kaise madad karun?"}
          </div>

          {showInput && !status && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={manualText} 
                onChange={e => setManualText(e.target.value)}
                placeholder="Command input..."
                onKeyDown={e => e.key === 'Enter' && handleCommand(manualText)}
                style={{ flex: 1, padding: '0.6rem 1rem', background: 'var(--bg-dark)', color: 'var(--text-main)', borderRadius: '12px', border: '1.5px solid var(--glass-border)', fontSize: '0.85rem', outline: 'none' }}
              />
              <button onClick={() => handleCommand(manualText)} className="btn-primary" style={{ padding: '0.6rem' }}>🚀</button>
            </div>
          )}
        </div>
      )}

      {/* Buttons Row */}
      <div style={{ display: 'flex', gap: '0.8rem' }}>
         <button 
          onClick={() => setShowInput(!showInput)}
          style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--bg-dark)', border: '1px solid #E5E7EB', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '1.2rem' }}
         >⌨️</button>

         <button 
          onClick={() => startListening(false)}
          style={{
            width: '70px', height: '70px', borderRadius: '50%',
            background: isListening ? '#EF4444' : 'linear-gradient(135deg, #4F46E5, #06B6D4)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.4rem', boxShadow: isListening ? '0 0 30px rgba(239, 68, 68, 0.5)' : '0 10px 25px rgba(79, 70, 229, 0.4)',
            transition: '0.3s', animation: isListening ? 'pulse-voice 1.5s infinite' : 'none'
          }}
        >
          {isListening ? '⏺️' : '🐜'}
        </button>
      </div>

      <style>{`
        @keyframes pulse-voice {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.15); box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}


function WelcomeModal({ isOpen, onClose, onUploadCSV, onAddManually }) {
  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, animation: 'fadeIn 0.4s ease'
      }}
    >
      <div className="glass-panel" style={{
        width: '90%', maxWidth: '750px', padding: '3.5rem',
        borderRadius: '24px', border: '1px solid rgba(6, 182, 212, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(6, 182, 212, 0.15)',
        position: 'relative', textAlign: 'center',
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.98) 100%)',
        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '1.5rem', right: '1.5rem',
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            fontSize: '2.5rem', cursor: 'pointer', transition: 'color 0.2s',
            lineHeight: 0.8, padding: '0.5rem'
          }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--danger)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          &times;
        </button>

        {/* Header */}
        <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'float 4s ease-in-out infinite' }}>🚀</div>
        <h2 style={{ 
          fontSize: '2.8rem', fontWeight: 900, margin: '0 0 1rem', 
          color: 'var(--text-main)', letterSpacing: '-1px' 
        }}>
          Welcome to <span style={{ color: 'var(--neon-accent)' }}>Inventory Ant</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', lineHeight: 1.6, marginBottom: '3rem', maxWidth: '550px', margin: '0 auto 3rem' }}>
          Your intelligent warehouse is ready. To unlock the full power of the Neural AI, please populate your initial inventory.
        </p>

        {/* Options */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          {/* Option 1 */}
          <div 
            onClick={onUploadCSV}
            className="ai-card"
            style={{
              padding: '2.5rem 1.5rem', cursor: 'pointer', border: '1px solid rgba(6, 182, 212, 0.3)',
              background: 'rgba(6, 182, 212, 0.05)', transition: 'all 0.3s ease',
              display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>📄</div>
            <h3 style={{ color: 'var(--neon-accent)', margin: '0 0 0.8rem', fontSize: '1.4rem' }}>Upload Master CSV</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
              Instantly sync your entire catalog. Headers map automatically.
            </p>
          </div>

          {/* Option 2 */}
          <div 
            onClick={onAddManually}
            className="ai-card"
            style={{
              padding: '2.5rem 1.5rem', cursor: 'pointer', border: '1px solid rgba(139, 92, 246, 0.3)',
              background: 'rgba(139, 92, 246, 0.05)', transition: 'all 0.3s ease',
              display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>✍️</div>
            <h3 style={{ color: '#8B5CF6', margin: '0 0 0.8rem', fontSize: '1.4rem' }}>Add Manually</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
              Start fresh and add items one by one into the registry.
            </p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

export default function App() {


  const [userId, setUserId] = useState(localStorage.getItem('ant_user') || '');
  const [view, setView] = useState('dashboard');
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

  const handleLogin = (id) => {
     const normalized = id.trim().toLowerCase();
     setUserId(normalized);
     localStorage.setItem('ant_user', normalized);
     setView('dashboard');
  }
  const handleLogout = () => {
     setUserId('');
     setProducts([]);
     setInventoryFilter('all');
     localStorage.removeItem('ant_user');
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
        <div className={theme === 'light' ? 'light-theme' : ''} style={{ display: 'flex', width: '100%', minHeight: '100vh', background: 'var(--bg-dark)' }}>
          <Sidebar setView={setView} view={view} userId={userId} onLogout={handleLogout} onSwitchAccount={handleSwitchAccount} setInventoryFilter={setInventoryFilter} theme={theme} onToggleTheme={toggleTheme} />
          
          {view === 'dashboard' && <Dashboard 
            products={products} 
            userId={userId} 
            onAlertClick={(mode) => { setView('inventory'); setInventoryFilter(mode); }} 
            onTotalClick={() => { setView('inventory'); setInventoryFilter('all'); }}
            onOpenScanner={handleOpenScanner}
            onGoToSettings={() => setView('settings')}
          />}
          {view === 'billing' && <Billing products={products} onSaleSuccess={fetchProducts} userId={userId} />}
          {view === 'inventory' && <Inventory products={products} onAddProduct={handleAddProduct} onDeleteProduct={handleDeleteProduct} filterMode={inventoryFilter} setFilterMode={setInventoryFilter} />}
          {view === 'ai_lab' && <AITools userId={userId} onScanResult={fetchProducts} onOpenScanner={handleOpenScanner} />}
          {view === 'settings' && <Settings userId={userId} onScanResult={fetchProducts} />}
          {view === 'guide' && <UserGuide />}
          {view === 'about' && <About theme={theme} />}
          {view === 'ant_x' && <AntXTerminal 
            userId={userId} 
            onUpdate={fetchProducts} 
            onNavigate={(page) => setView(page)} 
            onLogin={handleLogin} 
            currentView={view} 
            voiceState={{ isVoiceActive, setIsVoiceActive, globalTranscript, globalAiResponse, globalStatus }}
          />}

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


