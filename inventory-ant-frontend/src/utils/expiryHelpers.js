// --- GLOBAL HELPER: EXPIRES LOGIC ---
export const getExpiryInfo = (val) => {
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

export const getExpKey = (cols) => {
  return cols.find(k => {
    const lk = k.toLowerCase();
    return (lk.includes('expir') || lk.includes('exp.')) && !lk.includes('export') && !lk.includes('expens');
  });
};

