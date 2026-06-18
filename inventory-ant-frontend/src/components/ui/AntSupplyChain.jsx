import React, { useState, useEffect, useRef, useMemo } from 'react';
import '../../App.css';

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
      className="w-full h-[400px] bg-slate-950 rounded-3xl relative overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] border border-purple-500/20"
    >
      <canvas ref={canvasRef} width={800} height={400} className="w-full h-full" />

      <div className="absolute bottom-5 left-5 text-purple-500/50 text-[10px] tracking-[2px] uppercase font-mono">
        Live AI Core Sync // Warehouse_Matrix_Alpha
      </div>
    </div>
  );
}

export default AntSupplyChain;
