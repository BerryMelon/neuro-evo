'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationWorld } from '@/lib/neuro-evo/SimulationWorld';
import { EvolutionManager } from '@/lib/neuro-evo/EvolutionManager';
import { GRID_SIZE, TILE_SIZE, TileType, type Grid, INITIAL_GRID } from '@/lib/neuro-evo/constants';
import CommandSequenceView from '@/components/neuro-evo/CommandSequenceView';
import { Genome, CommandType, Command } from '@/lib/neuro-evo/Genome';
import { motion, AnimatePresence } from 'framer-motion';

const TICKS_PER_GEN = 1000;

export default function NeuroEvo() {
  const [grid, setGrid] = useState<Grid>(INITIAL_GRID);
  const [activeTileType, setActiveTileType] = useState<TileType>(TileType.WALL);
  const [isSimulating, setIsSimulating] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [bestFitness, setBestFitness] = useState(0);
  const [currentTicks, setCurrentTicks] = useState(0);
  const [bestGenome, setBestGenome] = useState<Genome | null>(null);
  const [bestCommandIndex, setBestCommandIndex] = useState(0);
  const [simSpeed, setSimSpeed] = useState(1); 
  const [currentEmoji, setCurrentEmoji] = useState('🐌');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  
  const [seedCommands, setSeedCommands] = useState<Command[]>([]);

  const simContainerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<SimulationWorld | null>(null);
  const evoRef = useRef<EvolutionManager>(new EvolutionManager(30));
  const requestRef = useRef<number>(null);
  const isDragging = useRef(false);
  
  // Use a ref for currentTicks to ensure the animation loop always has the fresh value
  const ticksRef = useRef(0);

  useEffect(() => {
    if (simContainerRef.current && !worldRef.current) {
      worldRef.current = new SimulationWorld(simContainerRef.current);
      worldRef.current.initRender();
      worldRef.current.updateGrid(grid);
    }
    return () => {
      worldRef.current?.destroy();
      worldRef.current = null;
    };
  }, []);

  useEffect(() => {
    worldRef.current?.updateGrid(grid);
  }, [grid]);

  const runTick = useCallback(() => {
    if (!worldRef.current || !evoRef.current || !isSimulating) return;

    for (let s = 0; s < simSpeed; s++) {
      evoRef.current.creatures.forEach(creature => {
        creature.update(worldRef.current!.goalPos, worldRef.current!.engine);
      });
      worldRef.current.step();
      ticksRef.current++;
    }

    // Sync ref to state for UI (infrequent sync for performance)
    setCurrentTicks(ticksRef.current);

    const sorted = [...evoRef.current.creatures].sort((a, b) => b.fitness - a.fitness);
    const best = sorted[0];
    setBestGenome(best.genome.clone());
    setBestCommandIndex(best.currentCommandIndex);

    const allFinished = evoRef.current.creatures.every(c => c.isDead || c.hasReachedGoal);

    if (ticksRef.current >= TICKS_PER_GEN || allFinished) {
      const { x, y } = worldRef.current.spawnPos;
      worldRef.current.clearCreatures(evoRef.current.creatures);
      evoRef.current.nextGeneration(x, y);
      worldRef.current.addCreatures(evoRef.current.creatures);
      
      setGeneration(evoRef.current.generation);
      setBestFitness(evoRef.current.bestFitness);
      setCurrentEmoji(evoRef.current.currentEmoji);
      ticksRef.current = 0;
      setCurrentTicks(0);
    }
    
    requestRef.current = requestAnimationFrame(runTick);
  }, [isSimulating, simSpeed]);

  useEffect(() => {
    if (isSimulating) {
      if (ticksRef.current === 0 && generation === 0) {
        const { x, y } = worldRef.current?.spawnPos || { x: 100, y: 100 };
        const seed = seedCommands.length > 0 ? new Genome(seedCommands) : undefined;
        evoRef.current.initPopulation(x, y, seed);
        worldRef.current?.addCreatures(evoRef.current.creatures);
        setCurrentEmoji(evoRef.current.currentEmoji);
      }
      requestRef.current = requestAnimationFrame(runTick);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isSimulating, runTick, generation, seedCommands]);

  const handleGridInteraction = (x: number, y: number) => {
    if (isSimulating) return;
    const newGrid = [...grid.map(row => [...row])];
    newGrid[y][x] = activeTileType;
    if (activeTileType === TileType.GOAL || activeTileType === TileType.SPAWN) {
      for (let gy = 0; gy < GRID_SIZE; gy++) {
        for (let gx = 0; gx < GRID_SIZE; gx++) {
          if (newGrid[gy][gx] === activeTileType && (gx !== x || gy !== y)) {
            newGrid[gy][gx] = TileType.EMPTY;
          }
        }
      }
    }
    setGrid(newGrid);
  };

  const toggleSimulation = () => {
    if (isSimulating) {
      setIsSimulating(false);
      worldRef.current?.clearCreatures(evoRef.current.creatures);
      ticksRef.current = 0;
      setCurrentTicks(0);
      setGeneration(0);
      setBestFitness(0);
      setBestGenome(null);
    } else {
      let hasSpawn = false;
      let hasGoal = false;
      for (const row of grid) {
        if (row.includes(TileType.SPAWN)) hasSpawn = true;
        if (row.includes(TileType.GOAL)) hasGoal = true;
      }
      if (!hasSpawn || !hasGoal) {
        alert("Please place both a SPAWN point and a GOAL point!");
        return;
      }
      setIsSimulating(true);
    }
  };

  const addSeedCommand = (type: CommandType) => {
    const defaultWeight = (type === CommandType.MOVE_LEFT || type === CommandType.MOVE_RIGHT || type === CommandType.WAIT) ? 60 : 1.0;
    setSeedCommands([...seedCommands, { type, weight: defaultWeight }]);
  };

  const randomizeSeed = () => {
    const randomGenome = evoRef.current.generateRandomGenome();
    setSeedCommands(randomGenome.commands);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-indigo-500 italic">COMMAND EVO</h1>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">Evolutionary Sandbox</p>
          </div>
          <div className="h-10 w-px bg-slate-800 ml-2" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Generation Progress</span>
            <div className="w-48 h-2 bg-slate-800 rounded-full mt-1 overflow-hidden border border-slate-700">
              <div 
                className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-100 ease-linear" 
                style={{ width: `${(currentTicks / TICKS_PER_GEN) * 100}%` }} 
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setShowHowItWorks(true)}
            className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors underline"
          >
            HOW DOES IT WORK?
          </button>
          <button 
            onClick={toggleSimulation}
            className={`px-8 py-3 rounded-xl font-black text-sm tracking-tight transition-all shadow-lg ${isSimulating ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'}`}
          >
            {isSimulating ? 'STOP SIMULATION' : 'START EVOLUTION'}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex">
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_100%)] from-indigo-500/5">
          <div className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-800 ring-8 ring-slate-900/50 bg-slate-950">
            <div ref={simContainerRef} className={`transition-opacity duration-500 ${isSimulating ? 'opacity-100' : 'opacity-30 pointer-events-none'}`} />
            {!isSimulating && (
              <div 
                className="absolute inset-0 grid gap-0 cursor-crosshair"
                style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, ${TILE_SIZE}px)`, gridTemplateRows: `repeat(${GRID_SIZE}, ${TILE_SIZE}px)` }}
                onMouseDown={() => { isDragging.current = true }}
                onMouseUp={() => { isDragging.current = false }}
                onMouseLeave={() => { isDragging.current = false }}
              >
                {grid.map((row, y) => row.map((tile, x) => (
                  <div
                    key={`${x}-${y}`}
                    onMouseDown={() => handleGridInteraction(x, y)}
                    onMouseEnter={() => isDragging.current && handleGridInteraction(x, y)}
                    className={`border-[0.5px] border-slate-800/30 transition-colors duration-150 ${
                      tile === TileType.WALL ? 'bg-slate-600' : 
                      tile === TileType.GOAL ? 'bg-green-500 shadow-[inset_0_0_10px_rgba(34,197,94,0.5)]' : 
                      tile === TileType.SPAWN ? 'bg-indigo-500 shadow-[inset_0_0_10px_rgba(99,102,241,0.5)]' :
                      'hover:bg-slate-800/50'
                    }`}
                  />
                )))}
              </div>
            )}
          </div>

          {/* Grid Toolbar Below Map */}
          {!isSimulating && (
            <div className="mt-8 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl shadow-xl gap-1">
                {[
                  { type: TileType.WALL, label: 'WALL', color: 'bg-slate-600' },
                  { type: TileType.SPAWN, label: 'SPAWN', color: 'bg-indigo-600' },
                  { type: TileType.GOAL, label: 'GOAL', color: 'bg-green-600' },
                  { type: TileType.EMPTY, label: 'ERASE', color: 'bg-slate-800 border border-slate-700' }
                ].map((btn) => (
                  <button 
                    key={btn.label}
                    onClick={() => setActiveTileType(btn.type)}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTileType === btn.type ? 'bg-white text-slate-950 scale-105 shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
                  >
                    <div className={`w-3 h-3 rounded-sm ${btn.color}`} />
                    {btn.label}
                  </button>
                ))}
                <div className="w-px bg-slate-800 mx-2 my-1" />
                <button 
                  onClick={() => setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(TileType.EMPTY)))}
                  className="px-6 py-2.5 rounded-xl text-xs font-black text-rose-500 hover:bg-rose-500/10 transition-all"
                >
                  CLEAR BOARD
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Board Designer</p>
            </div>
          )}
        </div>

        <aside className="w-[550px] border-l border-slate-800 bg-slate-900/30 p-6 flex flex-col gap-8 overflow-auto">
          <section className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-xl">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4 text-center">Gen {generation} Population: {currentEmoji}</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Top Fitness</p>
                <p className="text-3xl font-mono font-black text-green-400">{Math.round(bestFitness)}</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col justify-center">
                <p className="text-[8px] text-slate-500 uppercase font-bold mb-2">Sim Speed: {simSpeed}x</p>
                <input type="range" min="1" max="10" step="1" value={simSpeed} onChange={(e) => setSimSpeed(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
              </div>
            </div>
          </section>

          <section className="flex-1 flex flex-col min-h-0 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                {isSimulating ? 'Current Best DNA' : 'Seed Ancestor Editor'}
              </h3>
              {!isSimulating && (
                <button 
                  onClick={randomizeSeed}
                  className="text-[10px] font-black bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                >
                  RANDOMIZE SEED
                </button>
              )}
            </div>
            
            {isSimulating ? (
              bestGenome && <CommandSequenceView genome={bestGenome} currentIndex={bestCommandIndex} />
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-auto mb-6 bg-slate-950/50 rounded-2xl border border-slate-800 border-dashed p-6 min-h-[250px]">
                  {seedCommands.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-12">
                      <span className="text-5xl mb-4 opacity-20">🧬</span>
                      <p className="text-slate-600 text-[10px] font-bold italic leading-relaxed uppercase tracking-tighter">
                        Draw a sequence of actions below to design your first creature. 
                        Evolution will take care of the rest!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {seedCommands.map((cmd, i) => (
                        <div key={i} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col items-center relative group hover:border-indigo-500/50 transition-colors shadow-lg">
                          <span className="text-2xl mb-1">
                            {cmd.type.includes('LEFT') ? '←' : cmd.type.includes('RIGHT') ? '→' : cmd.type.includes('UP') ? '↑' : '⏳'}
                          </span>
                          <span className="font-black text-[8px] text-slate-500 uppercase">{cmd.type.split('_').pop()}</span>
                          <button 
                            onClick={() => setSeedCommands(seedCommands.filter((_, idx) => idx !== i))} 
                            className="absolute -top-2 -right-2 w-6 h-6 bg-rose-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(CommandType).map(type => (
                    <button 
                      key={type}
                      onClick={() => addSeedCommand(type)}
                      className="py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-700 text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] shadow-md"
                    >
                      + {type.replace('JUMP_', 'JUMP ').replace('MOVE_', 'MOVE ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </aside>
      </main>

      {/* How It Works Modal */}
      <AnimatePresence>
        {showHowItWorks && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHowItWorks(false)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-slate-900 border border-slate-800 rounded-[40px] p-10 max-w-2xl w-full shadow-2xl relative">
              <h2 className="text-3xl font-black mb-8 italic text-indigo-500 tracking-tighter">THE SCIENCE OF COMMAND EVO</h2>
              <div className="space-y-8 text-slate-300 text-sm leading-relaxed overflow-auto max-h-[60vh] pr-4">
                <section>
                  <h4 className="font-black text-white text-xs uppercase tracking-widest mb-3 text-indigo-400">1. Action Sequencing</h4>
                  <p>Unlike neural brains, these creatures use an <strong>Array of DNA</strong>. Each slot in the array is a specific instruction: Move, Jump, or Wait. They execute these in order until they reach the end or die.</p>
                </section>
                <section>
                  <h4 className="font-black text-white text-xs uppercase tracking-widest mb-3 text-indigo-400">2. Genetic Algorithms</h4>
                  <p>We start with 30 individuals. The ones that get closest to the goal are selected as parents. Their DNA is cloned and <strong>Mutated</strong> (commands added, deleted, or weights changed) to form the next generation.</p>
                </section>
                <section>
                  <h4 className="font-black text-white text-xs uppercase tracking-widest mb-3 text-indigo-400">3. Survival of the Fittest</h4>
                  <p>Creatures die if they go out of bounds. To win, a creature must not only reach the goal but <strong>stay there for 1 second</strong> to demonstrate stability. Faster times yield higher fitness scores!</p>
                </section>
              </div>
              <button onClick={() => setShowHowItWorks(false)} className="w-full mt-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl transition-all shadow-xl uppercase tracking-widest">Understood</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
