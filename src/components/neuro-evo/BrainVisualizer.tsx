'use client';

import { Brain, NeuronType } from '@/lib/neuro-evo/Brain';
import { motion } from 'framer-motion';

interface Props {
  brain: Brain;
}

export default function BrainVisualizer({ brain }: Props) {
  const neurons = Array.from(brain.neurons.values());
  
  // Simple layout logic: Inputs on left, Outputs on right, Hidden in middle
  const layout = neurons.map((n, i) => {
    let x = 50;
    let y = 50;

    if (n.type === NeuronType.INPUT) {
      x = 50;
      y = 30 + (i * 40);
    } else if (n.type === NeuronType.OUTPUT) {
      x = 350;
      y = 30 + ((i - 7) * 60); // 7 is number of default inputs
    } else {
      x = 200;
      y = 100 + (Math.random() * 200); // Randomish for hidden
    }

    return { ...n, x, y };
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-inner">
      <svg viewBox="0 0 400 400" className="w-full h-auto">
        {/* Connections */}
        {brain.connections.map((conn, i) => {
          const from = layout.find(n => n.id === conn.from);
          const to = layout.find(n => n.id === conn.to);
          if (!from || !to) return null;

          return (
            <line
              key={i}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={conn.weight > 0 ? '#6366f1' : '#f43f5e'}
              strokeWidth={Math.abs(conn.weight) * 2}
              opacity={0.4}
            />
          );
        })}

        {/* Neurons */}
        {layout.map((n) => (
          <g key={n.id}>
            <motion.circle
              cx={n.x} cy={n.y}
              r={12}
              fill="#1e293b"
              stroke={n.type === NeuronType.INPUT ? '#818cf8' : n.type === NeuronType.OUTPUT ? '#34d399' : '#94a3b8'}
              strokeWidth={2}
              animate={{
                fill: n.value > 0.1 ? '#6366f1' : '#1e293b',
                scale: n.value > 0.1 ? 1.2 : 1
              }}
            />
            <text 
              x={n.x} y={n.y + 25} 
              textAnchor="middle" 
              className="fill-slate-500 text-[8px] font-bold uppercase pointer-events-none"
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
