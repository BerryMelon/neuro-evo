'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationWorld } from '@/lib/neuro-evo/SimulationWorld';
import { EvolutionManager } from '@/lib/neuro-evo/EvolutionManager';
import { GRID_SIZE, TILE_SIZE, TileType, type Grid, INITIAL_GRID } from '@/lib/neuro-evo/constants';
import CommandSequenceView from '@/components/neuro-evo/CommandSequenceView';
import { Genome, CommandType, Command } from '@/lib/neuro-evo/Genome';

const TICKS_PER_GEN = 1000; // More ticks for commands

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
  
  // Manual Editor State
  const [seedCommands, setSeedCommands] = useState<Command[]>([]);

  const simContainerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<SimulationWorld | null>(null);
  const evoRef = useRef<EvolutionManager>(new EvolutionManager(30));
  const requestRef = useRef<number>(null);
  const isDragging = useRef(false);

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
    }

    const nextTicks = currentTicks + simSpeed;
    setCurrentTicks(nextTicks);

    // Update visualization
    const sorted = [...evoRef.current.creatures].sort((a, b) => b.fitness - a.fitness);
    const best = sorted[0];
    setBestGenome(best.genome.clone());
    setBestCommandIndex(best.currentCommandIndex);

    if (nextTicks >= TICKS_PER_GEN) {
      const { x, y } = worldRef.current.spawnPos;
      
      worldRef.current.clearCreatures(evoRef.current.creatures);
      evoRef.current.nextGeneration(x, y);
      worldRef.current.addCreatures(evoRef.current.creatures);
      
      setGeneration(evoRef.current.generation);
      setBestFitness(evoRef.current.bestFitness);
      setCurrentTicks(0);
    } else {
      requestRef.current = requestAnimationFrame(runTick);
    }
  }, [isSimulating, currentTicks, simSpeed]);

  useEffect(() => {
    if (isSimulating) {
      if (currentTicks === 0 && generation === 0) {
        const { x, y } = worldRef.current?.spawnPos || { x: 100, y: 100 };
        const seed = seedCommands.length > 0 ? new Genome(seedCommands) : undefined;
        evoRef.current.initPopulation(x, y, seed);
        worldRef.current?.addCreatures(evoRef.current.creatures);
      }
      requestRef.current = requestAnimationFrame(runTick);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isSimulating, runTick, currentTicks, generation, seedCommands]);

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
        alert("Need SPAWN and GOAL!");
        return;
      }
      setIsSimulating(true);
    }
  };

  const addSeedCommand = (type: CommandType) => {
    const defaultWeight = (type === CommandType.MOVE_LEFT || type === CommandType.MOVE_RIGHT || type === CommandType.WAIT) ? 60 : 1.0;
    setSeedCommands([...seedCommands, { type, weight: defaultWeight }]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-indigo-500">COMMAND EVO</h1>
            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Action Sequence Sandbox</p>
          </div>
          <div className="h-10 w-px bg-slate-800 ml-2" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Progression</span>
            <div className="w-32 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${(currentTicks / TICKS_PER_GEN) * 100}%` }} />
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            {Object.values(TileType).filter(v => typeof v === 'number').map(t => (
              <button 
                key={t}
                onClick={() => setActiveTileType(t as TileType)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${activeTileType === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {TileType[t as number]}
              </button>
            ))}
          </div>

          <button 
            onClick={toggleSimulation}
            className={`px-8 py-3 rounded-xl font-black text-sm tracking-tight transition-all shadow-lg ${isSimulating ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'}`}
          >
            {isSimulating ? 'STOP SIMULATION' : 'START EVOLUTION'}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex">
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_100%)] from-indigo-500/5">
          <div className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-800 ring-8 ring-slate-900/50">
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
        </div>

        <aside className="w-[450px] border-l border-slate-800 bg-slate-900/30 p-6 flex flex-col gap-8 overflow-auto">
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4 text-center">Stats</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <p className="text-[8px] text-slate-500 uppercase font-bold">Generation</p>
                <p className="text-2xl font-mono font-black text-indigo-400">{generation}</p>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <p className="text-[8px] text-slate-500 uppercase font-bold">Best Fitness</p>
                <p className="text-2xl font-mono font-bold text-green-400">{Math.round(bestFitness)}</p>
              </div>
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Simulation Speed</h3>
              <span className="text-xs font-mono font-bold text-slate-400">{simSpeed}x</span>
            </div>
            <input type="range" min="1" max="10" step="1" value={simSpeed} onChange={(e) => setSimSpeed(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
          </section>

          <section className="flex-1 flex flex-col min-h-0">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4 text-center">
              {isSimulating ? 'Best Creature Sequence' : 'Seed Ancestor Editor'}
            </h3>
            
            {isSimulating ? (
              bestGenome && <CommandSequenceView genome={bestGenome} currentIndex={bestCommandIndex} />
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed p-4 mb-4 overflow-auto">
                  {seedCommands.length === 0 ? (
                    <p className="text-slate-600 text-[10px] italic text-center mt-10">Add commands to create a "God Seed" or leave empty for random chaos</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {seedCommands.map((cmd, i) => (
                        <div key={i} className="bg-slate-800 p-2 rounded border border-slate-700 text-[10px] flex items-center gap-2">
                          <span className="font-bold">{cmd.type}</span>
                          <button onClick={() => setSeedCommands(seedCommands.filter((_, idx) => idx !== i))} className="text-rose-500 font-bold">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(CommandType).map(type => (
                    <button 
                      key={type}
                      onClick={() => addSeedCommand(type)}
                      className="py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-[8px] font-black uppercase tracking-widest"
                    >
                      + {type.replace('JUMP_', 'J ').replace('MOVE_', 'M ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="mt-auto">
            <button 
              onClick={() => setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(TileType.EMPTY)))}
              disabled={isSimulating}
              className="w-full py-3 rounded-xl border border-rose-900/30 bg-rose-950/10 text-xs font-bold text-rose-400 hover:bg-rose-900/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
            >
              CLEAR BOARD
            </button>
          </section>
        </aside>
      </main>
    </div>
  );
}
