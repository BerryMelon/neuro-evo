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
    <div className="flex flex-wrap gap-2 p-2 max-h-[400px] overflow-y-auto content-start">
      <AnimatePresence mode="popLayout">
        {genome.commands.map((cmd, i) => (
          <motion.div
            key={`${i}-${cmd.type}`}
            layout
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: currentIndex === i ? 1.1 : 1, 
              opacity: 1,
              outline: currentIndex === i ? '2px solid white' : 'none',
              zIndex: currentIndex === i ? 10 : 0
            }}
            className={`w-16 h-20 rounded-lg shadow-lg flex flex-col items-center justify-center relative transition-all ${getColor(cmd.type)} ${currentIndex === i ? 'ring-4 ring-indigo-400 shadow-indigo-500/50' : 'opacity-60'}`}
          >
            <span className="text-2xl font-bold text-white mb-1">{getIcon(cmd.type)}</span>
            <span className="text-[8px] font-black uppercase text-white/70 truncate w-full text-center px-1">
              {cmd.type.replace('_', ' ')}
            </span>
            <span className="text-[10px] font-mono font-bold text-white mt-1">
              {cmd.weight.toFixed(1)}
            </span>
            {currentIndex === i && (
              <motion.div 
                layoutId="active-indicator"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45"
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
