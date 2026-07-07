import React, { useEffect, useState, useRef } from 'react';
import { Heart, Rocket, ShieldCheck, Target, Users, Mic, Package, Clock, Sparkles, TrendingUp, Building, Layers, ArrowRight } from 'lucide-react';
import { CtaSection } from '../components/ui/CtaSection';
import { Reveal, StaggerGroup, StaggerItem } from '../components/ui/MotionPrimitives';

// ── Smart Warehouse Scanner Canvas ──────────────────────────────────
function SmartWarehouseScanner() {
  const canvasRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      const dark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark-theme');
      setIsDarkMode(dark);
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
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

    const items = Array.from({ length: COLS * ROWS }, () => ({
      rawStatus: Math.random() < 0.22 ? 'expired'
               : Math.random() < 0.3  ? 'expiring'
               : 'healthy',
      revealed: 0,
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

      ctx.fillStyle = isDarkMode ? '#1e293b' : '#f8fafc';
      ctx.fillRect(0, 0, W, H);

      // Subtle grid
      ctx.strokeStyle = isDarkMode ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.08)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 50) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 50) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }

      // Draw horizontal shelf beams
      const padLeft = 40, padTop = 30;
      const shelfW = (W - padLeft * 2);
      const shelfH = (H - padTop * 2);
      const colW   = shelfW / COLS;
      const rowH   = shelfH / ROWS;

      ctx.strokeStyle = isDarkMode ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.15)';
      ctx.lineWidth = 4;
      for (let r = 0; r <= ROWS; r++) {
        const y = padTop + r * rowH;
        ctx.beginPath(); ctx.moveTo(padLeft - 10, y); ctx.lineTo(W - padLeft + 10, y); ctx.stroke();
      }

      const phase  = (t % CYCLE) / CYCLE;
      const scanX  = phase * W;

      for (let r = 0; r < ROWS; r++) {
        const y = padTop + r * rowH + 6;
        const h = rowH - 12;

        for (let c = 0; c < COLS; c++) {
          const x = padLeft + c * colW + 8;
          const w = colW - 16;
          const itemIdx = r * COLS + c;
          const item = items[itemIdx];

          const centerItemX = x + w / 2;
          if (scanX > centerItemX && item.revealed < 1) {
            item.revealed = Math.min(1, item.revealed + 0.08);
          } else if (scanX < centerItemX && scanX < 50 && item.revealed > 0) {
            item.revealed = 0;
          }

          const colorBase = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)';
          const colorGoal = STATUS_COLOR[item.rawStatus];

          ctx.fillStyle = item.revealed > 0.01 ? colorGoal : colorBase;

          rr(x, y, w, h, 6);
          ctx.fill();

          if (item.revealed > 0.4) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(STATUS_LABEL[item.rawStatus], x + w/2, y + h/2);
          }
        }
      }

      // Vertical Scan Bar (Neon green/emerald line)
      const grad = ctx.createLinearGradient(scanX, 0, scanX, H);
      grad.addColorStop(0, 'rgba(16,185,129,0.02)');
      grad.addColorStop(0.5, '#10B981');
      grad.addColorStop(1, 'rgba(16,185,129,0.02)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(scanX, 0); ctx.lineTo(scanX, H); ctx.stroke();

      ctx.fillStyle = 'rgba(16,185,129,0.03)';
      ctx.fillRect(0, 0, scanX, H);

      t++;
      animId = requestAnimationFrame(draw);
    }

    draw();
    const ro = new ResizeObserver(setup);
    ro.observe(canvas);
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, [isDarkMode]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[280px] block rounded-2xl border border-slate-200 dark:border-slate-800"
    />
  );
}

// ── Interactive Problem/Solution Showcase ───────────────────────────
function StoryShowcase() {
  const [activeScene, setActiveScene] = useState(0);

  const scenes = [
    {
      tag: 'THE PROBLEM',
      icon: '😰',
      title: 'Manual chaos & expiry loss',
      lines: ['Manual chaos.', 'Invisible losses.', 'Expiry ignored.'],
      body: 'Every warehouse manager knows the pain. Spreadsheets, sticky notes, and guesswork — while lakhs in expired products silently drain revenue.',
      color: 'text-red-500 bg-red-50/10 border-red-200',
      glow: 'rgba(239, 68, 68, 0.08)',
      stat: '₹2.5L lost/month avg to expiry'
    },
    {
      tag: 'ANT X SEES ALL',
      icon: '🔍',
      title: 'Real-time shelf tracking',
      lines: ['Every item.', 'Every batch date.', 'Real-time clarity.'],
      body: "Inventory Ant's AI scans your entire shelf in seconds. Every product, every batch, every expiry — visible at a glance. No item is invisible anymore.",
      color: 'text-emerald-600 bg-emerald-50/10 border-emerald-200',
      glow: 'rgba(16, 185, 129, 0.08)',
      stat: '99% item tracking accuracy'
    },
    {
      tag: 'INSTANT COMMAND',
      icon: '🎙️',
      title: 'Hands-free voice agent',
      lines: ['"10 boxes add karo."', 'Done.', 'Zero typing.'],
      body: 'Just speak. Ant X hears your voice, matches the item intelligently, updates the stock matrix instantly. Your warehouse obeys you, not the other way.',
      color: 'text-amber-600 bg-amber-50/10 border-amber-200',
      glow: 'rgba(245, 158, 11, 0.08)',
      stat: '85% faster than spreadsheets'
    },
    {
      tag: 'ZERO WASTE',
      icon: '🏆',
      title: 'Pure warehouse efficiency',
      lines: ['No expired items.', 'No silent losses.', 'Pure efficiency.'],
      body: "The result: a warehouse where nothing expires quietly. Every rupee is protected. Every product is tracked. Every batch is moved before it's too late.",
      color: 'text-teal-600 bg-teal-50/10 border-teal-200',
      glow: 'rgba(20, 184, 166, 0.08)',
      stat: '40% reduction in expiry loss'
    }
  ];

  const s = scenes[activeScene];

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl relative overflow-hidden transition-all duration-500">
      {/* Background glow orb */}
      <div 
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none -right-20 -top-20 transition-all duration-700"
        style={{ background: `radial-gradient(circle, ${s.glow}, transparent 70%)` }}
      />
      
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-100 dark:border-slate-800 pb-4 relative z-10">
        {scenes.map((scene, idx) => (
          <button
            key={idx}
            onClick={() => setActiveScene(idx)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeScene === idx 
                ? 'bg-[#0f9d63] text-white border-[#0f9d63] shadow-sm font-extrabold' 
                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            {scene.icon} {scene.tag}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="grid md:grid-cols-2 gap-8 items-center text-left relative z-10">
        <div>
          <span className="text-[10px] tracking-[4px] font-extrabold uppercase text-emerald-600 block mb-2">
            {s.tag}
          </span>
          <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white mb-4">
            {s.title}
          </h3>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            {s.body}
          </p>
          <div className="inline-flex items-center gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
            <span className="text-xl md:text-2xl font-black text-emerald-600">✓</span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {s.stat}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {s.lines.map((line, li) => (
            <div 
              key={`${activeScene}-${li}`}
              className="text-2xl md:text-4xl font-black tracking-tight text-slate-800 dark:text-slate-100"
              style={{
                color: li === s.lines.length - 1 ? '#10B981' : 'inherit'
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main MarketingAbout Page ─────────────────────────────────────────
export default function MarketingAbout() {
  useEffect(() => {
    document.title = "About Us — Inventory Ant";
    window.scrollTo(0, 0);
  }, []);

  const values = [
    {
      icon: Heart,
      title: 'Built for Bharat',
      desc: 'Designed for real Indian businesses — simple in English and Hindi, priced in rupees, ready for GST.',
    },
    {
      icon: Target,
      title: 'Obsessed with simplicity',
      desc: 'If a shopkeeper can’t use it in 5 minutes, we redesign it. Powerful, never complicated.',
    },
    {
      icon: ShieldCheck,
      title: 'Trust & security first',
      desc: 'Your data is encrypted and backed up. We treat it like our own livelihood.',
    },
    {
      icon: Rocket,
      title: 'Always improving',
      desc: 'We ship updates every week based on feedback from thousands of business owners.',
    },
  ];

  const team = [
    { name: 'Aditya Verma', role: 'Co-founder & CEO', initials: 'AV' },
    { name: 'Sneha Iyer', role: 'Co-founder & CTO', initials: 'SI' },
    { name: 'Karthik Reddy', role: 'Head of Product', initials: 'KR' },
    { name: 'Meera Joshi', role: 'Head of Customer Success', initials: 'MJ' },
  ];

  const milestones = [
    { year: '2021', text: 'Founded in Bengaluru with a mission to digitise local retail.' },
    { year: '2022', text: 'Crossed 1,000 businesses and launched GST billing.' },
    { year: '2023', text: 'Reached 5,000+ stores and shipped the mobile app.' },
    { year: '2024', text: 'Now serving 12,000+ businesses across 28 states.' },
  ];

  const pillars = [
    { icon:'📦', tag:'INBOUND',       title:'Scan. Extract. Done.',   desc:'Scan any purchase bill — AI reads item codes, quantities, and batch dates instantly. Zero manual typing.',  color:'#10B981' },
    { icon:'🚚', tag:'OUTBOUND',      title:'Sell. Sync. Move.',       desc:'Billing auto-deducts from live stock matrix. No over-selling. No stockouts. Pure flow.',                   color:'#10B981' },
    { icon:'⏳', tag:'EXPIRY GUARD',  title:'Guard Before Loss.',      desc:'AI monitors every batch expiry months ahead. Move stock before the loss — not after.',                      color:'#F59E0B' },
    { icon:'🎙️', tag:'VOICE CONTROL', title:'Speak. It Happens.',     desc:'"10 pieces add karo" — Ant X hears you, executes instantly, confirms aloud. Hands-free warehouse.',         color:'#06B6D4' },
  ];

  return (
    <>
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-grid">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-[#0f9d63]/10 to-background" />
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal className="text-left">
              <span className="text-sm font-semibold uppercase tracking-wider text-[#0f9d63]">
                About Inventory Ant
              </span>
              <h1 className="mt-3 text-balance font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl text-slate-900 dark:text-white">
                Helping Indian businesses run smarter
              </h1>
              <p className="mt-5 text-pretty text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                Inventory Ant began with a simple observation: millions of Indian
                shops still track stock in paper registers. We set out to build
                affordable, delightfully simple software that gives every
                business — from the neighbourhood kirana to a growing
                distributor — the same superpowers as a big enterprise.
              </p>
              <p className="mt-4 text-pretty leading-relaxed text-slate-500 dark:text-slate-400">
                &ldquo;Ant&rdquo; represents hard work, organized teamwork, and a smart network. We are the bridge between traditional trades and modern intelligence.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
                <img
                  src="/warehouse-team.png"
                  alt="A business owner using Inventory Ant on a tablet inside an organised store"
                  className="h-auto w-full block"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* LIVE SCANNER SECTION */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Reveal className="text-center mb-10 flex flex-col items-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-[#0f9d63]">
            Live Intelligence
          </span>
          <h2 className="mt-3 text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
            Ant X scans your entire warehouse
          </h2>
          <p className="mt-3 text-base md:text-lg max-w-lg mx-auto text-slate-500 dark:text-slate-400">
            Watch how every product gets identified, categorised, and protected in real-time
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <SmartWarehouseScanner />
        </Reveal>
      </section>

      {/* MISSION & VISION */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2 text-left">
          <Reveal>
            <div className="h-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-[#0f9d63] p-8 text-white">
              <Target className="size-8 text-white" />
              <h2 className="mt-4 font-display text-2xl font-bold text-white m-0">Our Mission</h2>
              <p className="mt-3 leading-relaxed text-emerald-100 m-0">
                To empower 10 million Indian businesses with technology that
                helps them save time, reduce losses and grow with confidence.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="h-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
              <Rocket className="size-8 text-[#0f9d63]" />
              <h2 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white m-0">Our Vision</h2>
              <p className="mt-3 leading-relaxed text-slate-500 dark:text-slate-400 m-0">
                A future where every Indian business, no matter how small, runs
                on smart, connected and affordable tools — proudly made in India,
                for India.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOUR PILLARS */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 text-left">
        <Reveal className="text-center mb-12 flex flex-col items-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-[#0f9d63]">How We Do It</span>
          <h2 className="mt-3 text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
            Four pillars of zero-waste operations
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((p, i) => (
            <div key={i} className="abt-card p-6 rounded-3xl border relative overflow-hidden transition-all duration-300 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:-translate-y-1">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0f9d63]" />
              <div className="text-4xl mb-4">{p.icon}</div>
              <div className="text-[10px] tracking-[3px] font-extrabold mb-2 uppercase text-[#0f9d63]">{p.tag}</div>
              <h3 className="text-lg font-bold mb-3 text-slate-800 dark:text-slate-100">{p.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 m-0">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MEET ANT X FEATURE */}
      <section className="bg-slate-50/50 dark:bg-slate-900/40 py-20 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-20 items-center justify-center flex-wrap lg:flex-nowrap">
          {/* Orb */}
          <div className="flex-none w-[260px] h-[260px] relative flex items-center justify-center">
            <div className="w-[200px] h-[200px] rounded-full flex items-center justify-center text-7xl shadow-[0_0_60px_rgba(16,185,129,0.12)] border border-emerald-500/30 bg-emerald-500/5">
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
                <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full border text-[10px] font-bold whitespace-nowrap tracking-wider bg-white dark:bg-slate-800 shadow-sm" style={{
                  top:`calc(50% + ${Math.sin(rad)*130}px)`,
                  left:`calc(50% + ${Math.cos(rad)*130}px)`,
                  borderColor:`${tag.c}40`,
                  color: tag.c,
                }}>{tag.label}</div>
              );
            })}
          </div>

          {/* Copy */}
          <div className="flex-1 min-w-[280px] text-left">
            <p className="text-emerald-500/60 text-[10px] tracking-[4px] uppercase mb-4">AI AGENT</p>
            <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight tracking-tight text-slate-900 dark:text-white">
              Meet <span className="text-[#0f9d63]">Ant X</span> —<br />your warehouse brain.
            </h2>
            <p className="text-base md:text-lg leading-relaxed text-slate-500 dark:text-slate-400 mb-8">
              Ant X doesn't just answer questions — she acts. Voice commands, smart matching,
              expiry alerts, instant stock updates. One AI that runs your warehouse 24/7.
            </p>
            <div className="flex flex-col gap-4">
              {[
                { cmd:'"10 boxes add karo"',   res:'Stock updated via voice',        c:'#10B981' },
                { cmd:'Batch date scanned',     res:'Expiry alert auto-scheduled',    c:'#F59E0B' },
                { cmd:'Item name mismatch',     res:'Smart match prevents duplicate', c:'#06B6D4' },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="flex-1 text-xs md:text-sm font-mono text-slate-400">→ {row.cmd}</div>
                  <div className="w-px h-5 mx-4 bg-slate-200 dark:bg-slate-800" />
                  <div className="flex-1 text-xs md:text-sm font-bold" style={{ color: row.c }}>✓ {row.res}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STORY SHOWCASE */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal className="text-center mb-12 flex flex-col items-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-[#0f9d63]">Interactive Guide</span>
          <h2 className="mt-3 text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
            Operational Story
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <StoryShowcase />
        </Reveal>
      </section>

      {/* VALUES SECTION */}
      <section className="bg-slate-50/50 dark:bg-slate-900/40 py-20 border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center flex flex-col items-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-[#0f9d63]">
              What we stand for
            </span>
            <h2 className="mt-3 text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
              Our values
            </h2>
          </Reveal>
          <StaggerGroup className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-left">
            {values.map((value) => (
              <StaggerItem key={value.title}>
                <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-[#0f9d63]/10 text-[#0f9d63]">
                    <value.icon className="size-6" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-white">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400 m-0">
                    {value.desc}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* JOURNEY SECTION */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 text-left">
        <Reveal className="text-center flex flex-col items-center">
          <h2 className="text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
            Our journey so far
          </h2>
        </Reveal>
        <div className="mt-12 space-y-6">
          {milestones.map((m, i) => (
            <Reveal key={m.year} delay={i * 0.08}>
              <div className="flex gap-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <span className="font-display text-2xl font-extrabold text-[#0f9d63]">
                  {m.year}
                </span>
                <p className="flex-1 leading-relaxed text-slate-600 dark:text-slate-300 m-0 text-sm font-semibold">
                  {m.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* VISION CLOSING QUOTE */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 text-center relative overflow-hidden border-t border-slate-100 dark:border-slate-800">
        <div className="absolute inset-0 flex items-center justify-center text-[10rem] md:text-[18rem] font-black tracking-tighter pointer-events-none select-none text-emerald-500/5">
          ANT
        </div>
        <div className="relative max-w-2xl mx-auto">
          <span className="text-[10px] tracking-[4px] uppercase text-[#0f9d63] font-bold block mb-4">
            Our Vision Quote
          </span>
          <blockquote className="text-xl md:text-3xl font-extrabold leading-snug mb-8 tracking-tight text-slate-800 dark:text-white">
            "A world where <span className="text-[#0f9d63]">zero products</span> expire in a warehouse —<br />because every item has a <span className="text-[#0f9d63] font-black">guardian.</span>"
          </blockquote>
          <p className="text-sm md:text-base leading-relaxed text-slate-500 dark:text-slate-400 mb-8">
            Inventory Ant is not a feature. It is a mission — to end the silent thief of
            the FMCG and Beauty industry: expiry loss. We are the guardian between your products and waste.
          </p>
        </div>
      </section>

      {/* TEAM SECTION */}
      <section className="bg-slate-50/50 dark:bg-slate-900/40 py-20 border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center flex flex-col items-center">
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#0f9d63]">
              <Users className="size-4" /> The team
            </span>
            <h2 className="mt-3 text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
              Meet the people behind Inventory Ant
            </h2>
          </Reveal>
          <StaggerGroup className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-center">
            {team.map((member) => (
              <StaggerItem key={member.name}>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center shadow-sm">
                  <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#0f9d63]/10 font-display text-2xl font-bold text-[#0f9d63]">
                    {member.initials}
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold text-slate-900 dark:text-white m-0">
                    {member.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 m-0 mt-1">{member.role}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <CtaSection />
    </>
  );
}
