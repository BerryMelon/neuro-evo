'use client';

import { Genome, CommandType } from '@/lib/neuro-evo/Genome';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  genome: Genome;
  currentIndex: number;
}

export default function CommandSequenceView({ genome, currentIndex }: Props) {
  const getIcon = (type: CommandType) => {
    switch (type) {
      case CommandType.MOVE_LEFT: return '←';
      case CommandType.MOVE_RIGHT: return '→';
      case CommandType.JUMP_LEFT: return '↖';
      case CommandType.JUMP_RIGHT: return '↗';
      case CommandType.JUMP_UP: return '↑';
      case CommandType.WAIT: return '⏳';
    }
  };

  const getColor = (type: CommandType) => {
    switch (type) {
      case CommandType.WAIT: return 'bg-slate-700';
      case CommandType.MOVE_LEFT:
      case CommandType.MOVE_RIGHT: return 'bg-blue-600';
      default: return 'bg-indigo-600';
    }
  };

  return (
    <div className="flex flex-wrap gap-3 p-4 max-h-[500px] overflow-y-auto content-start justify-center">
      <AnimatePresence mode="popLayout">
        {genome.commands.map((cmd, i) => {
          const isActive = currentIndex === i;
          return (
            <motion.div
              key={`${i}-${cmd.type}`}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: isActive ? 1.15 : 1, 
                opacity: 1,
                zIndex: isActive ? 10 : 0
              }}
              className={`w-20 h-24 rounded-xl shadow-xl flex flex-col items-center justify-center relative transition-all border-2 ${isActive ? 'bg-indigo-500 border-white ring-4 ring-indigo-500/30' : 'bg-slate-800 border-slate-700 opacity-40'}`}
            >
              {isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-indigo-600 text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse whitespace-nowrap">
                  RUNNING
                </div>
              )}
              
              <span className="text-3xl font-bold text-white mb-1">{getIcon(cmd.type)}</span>
              <span className="text-[8px] font-black uppercase text-white/70 truncate w-full text-center px-1">
                {cmd.type.replace('_', ' ')}
              </span>
              <span className="text-[10px] font-mono font-bold text-white mt-1">
                {cmd.weight.toFixed(1)}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
