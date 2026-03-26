'use client';

import { Brain, NeuronType } from '@/lib/neuro-evo/Brain';
import { motion } from 'framer-motion';

interface Props {
  brain: Brain;
}

export default function BrainVisualizer({ brain }: Props) {
  const neurons = Array.from(brain.neurons.values());
  
  // Advanced Layout Logic
  const inputs = neurons.filter(n => n.type === NeuronType.INPUT);
  const hiddens = neurons.filter(n => n.type === NeuronType.HIDDEN);
  const outputs = neurons.filter(n => n.type === NeuronType.OUTPUT);

  const getPosition = (n: any) => {
    let x = 50;
    let y = 50;

    if (n.type === NeuronType.INPUT) {
      x = 40;
      const index = inputs.indexOf(n);
      y = 20 + (index * (360 / Math.max(1, inputs.length - 1)));
      if (inputs.length === 1) y = 200;
    } else if (n.type === NeuronType.OUTPUT) {
      x = 360;
      const index = outputs.indexOf(n);
      y = 50 + (index * (300 / Math.max(1, outputs.length - 1)));
      if (outputs.length === 1) y = 200;
    } else {
      x = 200;
      const index = hiddens.indexOf(n);
      y = 50 + (index * (300 / Math.max(1, hiddens.length - 1)));
      if (hiddens.length === 1) y = 200;
    }

    return { x, y };
  };

  const layout = neurons.map(n => ({ ...n, ...getPosition(n) }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-inner h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <svg viewBox="0 0 400 400" className="w-full h-full preserve-3d">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
            </marker>
          </defs>

          {/* Connections */}
          {brain.connections.map((conn, i) => {
            const from = layout.find(n => n.id === conn.from);
            const to = layout.find(n => n.id === conn.to);
            if (!from || !to) return null;

            const fromNeuron = brain.neurons.get(conn.from);
            const isFiring = (fromNeuron?.value || 0) > 0.1;

            return (
              <g key={i}>
                <line
                  x1={from.x} y1={from.y}
                  x2={to.x} y2={to.y}
                  stroke={conn.weight > 0 ? '#6366f1' : '#f43f5e'}
                  strokeWidth={Math.abs(conn.weight) * 2.5}
                  opacity={isFiring ? 0.8 : 0.15}
                  className="transition-opacity duration-200"
                />
                {isFiring && (
                  <motion.circle
                    r={2}
                    fill="white"
                    initial={{ offsetDistance: "0%" }}
                    animate={{ offsetDistance: "100%" }}
                    transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                    style={{
                      offsetPath: `path('M ${from.x} ${from.y} L ${to.x} ${to.y}')`,
                    }}
                  />
                )}
              </g>
            );
          })}

          {/* Neurons */}
          {layout.map((n) => (
            <g key={n.id}>
              <motion.circle
                cx={n.x} cy={n.y}
                r={14}
                fill="#0f172a"
                stroke={n.type === NeuronType.INPUT ? '#818cf8' : n.type === NeuronType.OUTPUT ? '#34d399' : '#94a3b8'}
                strokeWidth={3}
                animate={{
                  fill: n.value > 0.1 ? (n.value > 0 ? '#6366f1' : '#f43f5e') : '#0f172a',
                  scale: n.value > 0.1 ? 1.15 : 1,
                  boxShadow: n.value > 0.1 ? "0 0 20px rgba(99,102,241,0.5)" : "none"
                }}
              />
              <text 
                x={n.x} y={n.y + 30} 
                textAnchor="middle" 
                className="fill-slate-400 text-[9px] font-black uppercase pointer-events-none tracking-tighter"
              >
                {n.label}
              </text>
              <text 
                x={n.x} y={n.y + 4} 
                textAnchor="middle" 
                className="fill-white text-[8px] font-mono font-bold pointer-events-none"
              >
                {n.value.toFixed(1)}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-4 flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-400"/> Input</div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-400"/> Hidden</div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400"/> Output</div>
      </div>
    </div>
  );
}
