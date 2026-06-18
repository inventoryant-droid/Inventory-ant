import React, { useState, useEffect, useRef, useMemo } from 'react';
import '../App.css';

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

      // Draw Grid / Shelves
      const padLeft = 40, padTop = 30;
      const shelfW = (W - padLeft * 2);
      const shelfH = (H - padTop * 2);
      const colW   = shelfW / COLS;
      const rowH   = shelfH / ROWS;

      // Draw horizontal shelf beams
      ctx.strokeStyle = isDark ? 'rgba(6,182,212,0.15)' : 'rgba(59,130,246,0.18)';
      ctx.lineWidth = 4;
      for (let r = 0; r <= ROWS; r++) {
        const y = padTop + r * rowH;
        ctx.beginPath(); ctx.moveTo(padLeft - 10, y); ctx.lineTo(W - padLeft + 10, y); ctx.stroke();
      }

      // Items on shelves
      for (let r = 0; r < ROWS; r++) {
        const y = padTop + r * rowH + 6;
        const h = rowH - 12;

        for (let c = 0; c < COLS; c++) {
          const x = padLeft + c * colW + 8;
          const w = colW - 16;
          const itemIdx = r * COLS + c;
          const item = items[itemIdx];

          // If scanner passed this x position, we update its reveal progress
          const centerItemX = x + w / 2;
          if (scanX > centerItemX && item.revealed < 1) {
            item.revealed = Math.min(1, item.revealed + 0.08);
          } else if (scanX < centerItemX && scanX < 50 && item.revealed > 0) {
            // reset on cycle wrap
            item.revealed = 0;
          }

          // Draw item body
          const colorBase = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)';
          const colorGoal = STATUS_COLOR[item.rawStatus];

          // Interpolated color
          ctx.fillStyle = item.revealed > 0.01 
            ? colorGoal 
            : colorBase;

          rr(x, y, w, h, 6);
          ctx.fill();

          // Draw status text inside if revealed
          if (item.revealed > 0.4) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(STATUS_LABEL[item.rawStatus], x + w/2, y + h/2);
          }
        }
      }

      // Vertical Scan Bar (Neon cyan line)
      const grad = ctx.createLinearGradient(scanX, 0, scanX, H);
      grad.addColorStop(0, 'rgba(6,182,212,0.02)');
      grad.addColorStop(0.5, '#06B6D4');
      grad.addColorStop(1, 'rgba(6,182,212,0.02)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(scanX, 0); ctx.lineTo(scanX, H); ctx.stroke();

      // Scan glow overlay (behind scanner)
      ctx.fillStyle = 'rgba(6,182,212,0.03)';
      ctx.fillRect(0, 0, scanX, H);

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
      className="w-full h-[280px] block rounded-2xl border"
      style={{
        borderColor: theme === 'light' ? 'rgba(59,130,246,0.15)' : 'rgba(6,182,212,0.12)',
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

  return (
    <div ref={sectionRef} className="h-[120vh] relative">
      {/* Sticky panel */}
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 to-slate-900">

        {/* Animated BG blob */}
        <div 
          className="absolute w-[300px] md:w-[600px] h-[300px] md:h-[600px] rounded-full transition-all duration-700 pointer-events-none" 
          style={{
            background: `radial-gradient(circle, ${s.color}12, transparent 70%)`,
          }}
        />

        {/* Subtle grid */}
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-700" 
          style={{
            backgroundImage: `linear-gradient(${s.color}08 1px, transparent 1px), linear-gradient(90deg, ${s.color}08 1px, transparent 1px)`,
            backgroundSize: '70px 70px',
          }}
        />

        {/* Scene counter dots */}
        <div className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30">
          {STORY_SCENES.map((sc, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-500 ${scene === i ? 'w-7' : 'w-2'}`}
              style={{
                background: scene === i ? sc.color : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <div 
          className={`max-w-[900px] w-[90%] z-10 transition-all duration-500 ${
            fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {/* Tag */}
          <div 
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border text-[10px] tracking-[4px] font-extrabold mb-8"
            style={{
              borderColor: `${s.color}40`,
              background: `${s.color}10`,
              color: s.color,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.color }} />
            {s.tag}
          </div>

          {/* Headline lines — one by one, staggered */}
          <div className="mb-8">
            {s.lines.map((line, li) => (
              <div 
                key={`${scene}-${li}`} 
                className="text-4xl md:text-7xl lg:text-8xl font-black leading-tight tracking-tighter"
                style={{
                  color: li === s.lines.length - 1 ? s.color : '#ffffff',
                  opacity: 0,
                  transform: 'translateY(40px)',
                  animation: `abt_lineIn 0.7s cubic-bezier(0.16,1,0.3,1) ${li * 0.12}s forwards`,
                }}
              >
                {line}
              </div>
            ))}
          </div>

          {/* Body text */}
          <p className="text-white/50 text-base md:text-xl leading-relaxed max-w-[620px] mb-8 opacity-0 animate-[abt_lineIn_0.7s_ease_0.4s_forwards]">
            {s.body}
          </p>

          {/* Stat badge */}
          <div 
            className="inline-flex items-center gap-6 p-4 md:p-6 rounded-2xl border opacity-0 animate-[abt_lineIn_0.7s_ease_0.55s_forwards]"
            style={{
              borderColor: `${s.color}30`,
              background: `${s.color}08`,
            }}
          >
            <span className="text-3xl md:text-4xl font-extrabold font-mono" style={{ color: s.color }}>
              {s.stat.num}
            </span>
            <span className="text-white/40 text-xs md:text-sm max-w-[180px] leading-snug">
              {s.stat.label}
            </span>
          </div>
        </div>

        {/* Huge background icon */}
        <div className="absolute -right-8 -bottom-8 text-[12rem] md:text-[20rem] opacity-[0.03] pointer-events-none select-none transition-all duration-700 grayscale">
          {s.icon}
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center opacity-30">
          <div className="text-[10px] tracking-[3px] mb-1.5" style={{ color: s.color }}>SCROLL</div>
          <div className="w-px h-9 mx-auto" style={{ background: `linear-gradient(${s.color}, transparent)` }} />
        </div>

      </div>

      {/* Animations */}
      <style>{`
        @keyframes abt_lineIn { to { opacity: 1; transform: translateY(0); } }
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
      className="flex-1 overflow-y-auto overflow-x-hidden font-sans transition-colors duration-300"
      style={{ background: T.bg }}
    >

      {/* ═══ HERO ═══════════════════════════════════════════════════ */}
      <div
        ref={heroRef}
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6 py-24 md:py-32"
        style={{
          background: dark
            ? 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.06) 0%, transparent 50%), #020617'
            : 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.06) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.04) 0%, transparent 50%), #ffffff',
        }}
      >
        {/* Grid BG */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage:`linear-gradient(${T.grid} 1px,transparent 1px),linear-gradient(90deg,${T.grid} 1px,transparent 1px)`,
          backgroundSize:'64px 64px' }} />

        {/* Orbs */}
        <div className="absolute w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full -top-32 -left-24 pointer-events-none animate-[abt_float_7s_ease-in-out_infinite]" style={{
          background: dark ? 'radial-gradient(circle,rgba(59,130,246,0.09) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 70%)',
        }} />
        <div className="absolute w-[250px] md:w-[380px] h-[250px] md:h-[380px] rounded-full -bottom-24 -right-16 pointer-events-none animate-[abt_float_9s_ease-in-out_infinite_3s]" style={{
          background: dark ? 'radial-gradient(circle,rgba(6,182,212,0.07) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(6,182,212,0.05) 0%,transparent 70%)',
        }} />

        {/* Badge */}
        <div 
          className="inline-flex items-center gap-2 px-4.5 py-1.5 rounded-full border text-[10px] tracking-[4px] font-bold mb-8 transition-opacity duration-1000 delay-200"
          style={{
            borderColor: dark ? 'rgba(6,182,212,0.3)' : 'rgba(59,130,246,0.3)',
            background: dark ? 'rgba(6,182,212,0.06)' : 'rgba(59,130,246,0.05)',
            color: dark ? '#06B6D4' : '#3B82F6',
            opacity: heroVis ? 1 : 0,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: dark ? '#06B6D4' : '#3B82F6' }} />
          INVENTORY ANT — B2B WAREHOUSE INTELLIGENCE
        </div>

        {/* Headline */}
        <h1 
          className={`text-4xl md:text-7xl lg:text-8xl font-black text-center leading-none tracking-tighter mb-6 max-w-4xl transition-all duration-1000 delay-[350ms] ${
            heroVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
          style={{ color: T.text }}
        >
          Your Warehouse.{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">Simplified.</span>
        </h1>

        {/* Sub */}
        <p 
          className={`text-base md:text-xl max-w-xl text-center leading-relaxed mb-14 transition-all duration-1000 delay-[500ms] ${
            heroVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
          style={{ color: T.textMid }}
        >
          We don't just track inventory. We give warehouse managers the clarity, speed,
          and intelligence they've never had before — powered entirely by AI.
        </p>

        {/* Floating ant */}
        <div 
          className={`text-7xl md:text-8xl animate-[abt_float_5s_ease-in-out_infinite] mb-8 transition-opacity duration-1000 delay-[650ms] ${
            heroVis ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            filter: dark ? 'drop-shadow(0 0 28px rgba(6,182,212,0.45))' : 'drop-shadow(0 4px 16px rgba(59,130,246,0.3))',
          }}
        >🐜</div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-40">
          <span className="text-[10px] tracking-[3px]" style={{ color: T.accent }}>SCROLL</span>
          <div className="w-px h-9" style={{ background: `linear-gradient(${T.accent}, transparent)` }} />
        </div>
      </div>

      {/* ═══ SCROLL STORY (Apple Vision Pro motion) ═════════════════ */}
      <ScrollStorySection scrollContainerRef={scrollRef} />

      {/* ═══ SCANNER CANVAS ═════════════════════════════════════════ */}
      <div className="py-20 px-6 max-w-[1100px] mx-auto">
        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[4px] uppercase mb-4" style={{ color: dark ? 'rgba(6,182,212,0.6)' : 'rgba(59,130,246,0.7)' }}>
            Live Intelligence
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight" style={{ color: T.text }}>
            Ant X scans your <span style={{ color: T.accent }}>entire warehouse</span>
          </h2>
          <p className="mt-3 text-base md:text-lg max-w-lg mx-auto" style={{ color: T.textMid }}>
            Watch how every product gets identified, categorised, and protected in real-time
          </p>
        </div>
        <SmartWarehouseScanner theme={theme} />
      </div>
 
      {/* ═══ STATS ══════════════════════════════════════════════════ */}
      <div className="py-20 px-6 border-y" style={{ background: T.bgSub, borderColor: T.border }}>
        <div className="max-w-[900px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { r: stat1Ref, val: stat1, suf:'%', label:'Less Expiry Loss',   desc:'Average after 30 days with Ant', color:'#06B6D4' },
            { r: stat2Ref, val: stat2, suf:'%', label:'Faster Stock Ops',   desc:'vs. manual spreadsheet entry',   color:'#8B5CF6' },
            { r: stat3Ref, val: stat3, suf:'%', label:'Accuracy Rate',       desc:'AI-powered item matching',       color:'#10B981' },
          ].map((s, i) => (
            <div key={i} ref={s.r} className="abt-stat text-center p-8 border rounded-2xl transition-all duration-300 hover:scale-[1.05]" style={{
              borderColor: `${s.color}20`,
              background: dark ? `radial-gradient(circle at 50% 0%,${s.color}08,transparent 70%)` : `radial-gradient(circle at 50% 0%,${s.color}06,transparent 70%)`,
            }}>
              <div 
                className="text-5xl font-black mb-3 bg-clip-text text-transparent"
                style={{
                  backgroundImage:`linear-gradient(135deg,${s.color},${dark ? '#ffffff' : '#0f172a'})`,
                }}
              >{s.val}{s.suf}</div>
              <div className="font-bold text-base mb-1" style={{ color: T.text }}>{s.label}</div>
              <div className="text-xs" style={{ color: T.textDim }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 4 PILLARS ══════════════════════════════════════════════ */}
      <div
        ref={pillarsRef}
        className={`py-24 px-6 max-w-[1200px] mx-auto transition-all duration-1000 ${
          pillarsVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="text-center mb-14">
          <p className="text-[10px] tracking-[4px] uppercase mb-4" style={{ color: dark ? 'rgba(6,182,212,0.6)' : 'rgba(59,130,246,0.65)' }}>How We Do It</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight" style={{ color: T.text }}>
            Four pillars of <span style={{ color: T.accent }}>zero-waste ops</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((p, i) => (
            <div key={i} className="abt-card p-8 rounded-3xl border relative overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:scale-[1.015]" style={{
              borderColor: `${p.color}20`,
              background: dark
                ? `radial-gradient(circle at 30% 0%,${p.color}08,transparent 60%), rgba(255,255,255,0.01)`
                : `radial-gradient(circle at 30% 0%,${p.color}05,transparent 60%), rgba(0,0,0,0.01)`,
            }}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background:`linear-gradient(90deg,transparent,${p.color},transparent)` }} />
              <div className="text-4xl mb-4">{p.icon}</div>
              <div className="text-[10px] tracking-[3px] font-extrabold mb-2 uppercase" style={{ color: p.color }}>{p.tag}</div>
              <h3 className="text-lg font-bold mb-3" style={{ color: T.text }}>{p.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: T.textMid }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ANT X FEATURE ROW ══════════════════════════════════════ */}
      <div className="py-28 px-6" style={{ background: dark ? 'linear-gradient(180deg,#020617 0%,rgba(6,78,59,0.12) 50%,#020617 100%)' : 'linear-gradient(180deg,#ffffff 0%,rgba(16,185,129,0.04) 50%,#ffffff 100%)' }}>
        <div className="max-w-[1100px] mx-auto flex gap-20 items-center justify-center flex-wrap lg:flex-nowrap">

          {/* Orb */}
          <div className="flex-none w-[260px] h-[260px] relative flex items-center justify-center">
            <div className="w-[200px] h-[200px] rounded-full flex items-center justify-center text-7xl shadow-[0_0_60px_rgba(16,185,129,0.12)] animate-[abt_glow_4s_ease-in-out_infinite] border border-emerald-500/30" style={{
              background:'radial-gradient(circle,rgba(16,185,129,0.15) 0%,transparent 70%)',
            }}>
              <div className="animate-[abt_float_5s_ease-in-out_infinite]">🐜</div>
            </div>
            {[1.3, 1.65].map((sc, i) => (
              <div key={i} className={`absolute rounded-full border animate-[abt_spin_15s_linear_infinite] ${i % 2 ? 'reverse' : ''}`} style={{
                width:`${sc * 200}px`, height:`${sc * 200}px`,
                borderColor: `rgba(16,185,129,${0.12 - i * 0.04})`,
              }} />
            ))}
            {[{label:'Voice AI',angle:0,c:'#10B981'},{label:'Expiry Guard',angle:120,c:'#F59E0B'},{label:'Smart Match',angle:240,c:'#06B6D4'}].map((tag, i) => {
              const rad = tag.angle * Math.PI / 180;
              return (
                <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full border text-[10px] font-bold whitespace-nowrap tracking-wider" style={{
                  top:`calc(50% + ${Math.sin(rad)*130}px)`,
                  left:`calc(50% + ${Math.cos(rad)*130}px)`,
                  background:`${tag.c}15`, borderColor:`${tag.c}40`,
                  color: tag.c,
                }}>{tag.label}</div>
              );
            })}
          </div>

          {/* Copy */}
          <div className="flex-1 min-w-[280px]">
            <p className="text-emerald-500/60 text-[10px] tracking-[4px] uppercase mb-4">AI AGENT</p>
            <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight tracking-tight" style={{ color: T.text }}>
              Meet <span className="text-emerald-500">Ant X</span> —<br />your warehouse brain.
            </h2>
            <p className="text-base md:text-lg leading-relaxed mb-8" style={{ color: T.textMid }}>
              Ant X doesn't just answer questions — she acts. Voice commands, smart matching,
              expiry alerts, instant stock updates. One AI that runs your warehouse 24/7.
            </p>
            <div className="flex flex-col gap-4">
              {[
                { cmd:'"10 boxes add karo"',   res:'Stock updated via voice',        c:'#10B981' },
                { cmd:'Batch date scanned',     res:'Expiry alert auto-scheduled',    c:'#F59E0B' },
                { cmd:'Item name mismatch',     res:'Smart match prevents duplicate', c:'#06B6D4' },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border" style={{
                  borderColor: T.border,
                  background: T.bgCard,
                }}>
                  <div className="flex-1 text-xs md:text-sm font-mono" style={{ color: T.textDim }}>→ {row.cmd}</div>
                  <div className="w-px h-5 mx-4" style={{ background: T.border }} />
                  <div className="flex-1 text-xs md:text-sm font-bold" style={{ color: row.c }}>✓ {row.res}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ VISION CLOSING ═════════════════════════════════════════ */}
      <div
        ref={missionRef}
        className={`py-32 px-6 text-center relative overflow-hidden transition-all duration-1000 ${
          missionVis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
        style={{ background: dark ? '#020617' : '#ffffff' }}
      >
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center text-[8rem] md:text-[20rem] font-black tracking-tighter pointer-events-none select-none" style={{
          color: dark ? 'rgba(6,182,212,0.025)' : 'rgba(59,130,246,0.04)',
        }}>ANT</div>

        <div className="relative max-w-2xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase mb-8" style={{ color: dark ? 'rgba(6,182,212,0.6)' : 'rgba(59,130,246,0.65)' }}>
            Our Vision
          </p>
          <blockquote className="text-2xl md:text-4xl font-extrabold leading-snug mb-10 tracking-tight" style={{ color: T.text }}>
            "A world where <span style={{ color: T.accent }}>zero products</span> expire in a warehouse —<br />because every item has a <span className="text-emerald-500">guardian.</span>"
          </blockquote>
          <p className="text-base md:text-lg leading-relaxed mb-12" style={{ color: T.textMid }}>
            Inventory Ant is not a feature. It is a mission — to end the silent thief of
            the FMCG and Beauty industry: expiry loss. We are the guardian between your products and waste.
          </p>
          <div className="inline-flex items-center gap-3 opacity-40">
            <div className="w-10 h-px" style={{ background: T.accent + '80' }} />
            <span className="text-[10px] tracking-[4px]" style={{ color: T.accent }}>INVENTORY ANT // ZERO WASTE PROTOCOL</span>
            <div className="w-10 h-px" style={{ background: T.accent + '80' }} />
          </div>
        </div>
      </div>

    </div>
  );
}

export default About;
