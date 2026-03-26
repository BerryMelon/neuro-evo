'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { SimulationWorld } from '@/lib/neuro-evo/SimulationWorld';
import { EvolutionManager } from '@/lib/neuro-evo/EvolutionManager';
import { GRID_SIZE, TILE_SIZE, TileType, type Grid, INITIAL_GRID } from '@/lib/neuro-evo/constants';
import BrainVisualizer from '@/components/neuro-evo/BrainVisualizer';
import { Brain } from '@/lib/neuro-evo/Brain';

const TICKS_PER_GEN = 500;

export default function NeuroEvo() {
  const [grid, setGrid] = useState<Grid>(INITIAL_GRID);
  const [activeTileType, setActiveTileType] = useState<TileType>(TileType.WALL);
  const [isSimulating, setIsSimulating] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [bestFitness, setBestFitness] = useState(0);
  const [currentTicks, setCurrentTicks] = useState(0);
  const [bestBrain, setBestBrain] = useState<Brain | null>(null);
  
  const simContainerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<SimulationWorld | null>(null);
  const evoRef = useRef<EvolutionManager>(new EvolutionManager(30));
  const requestRef = useRef<number>(null);
  const isDragging = useRef(false);

  // Initialize simulation world
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

  // Update world when grid changes
  useEffect(() => {
    worldRef.current?.updateGrid(grid);
  }, [grid]);

  const runTick = useCallback(() => {
    if (!worldRef.current || !evoRef.current || !isSimulating) return;

    evoRef.current.creatures.forEach(creature => {
      creature.update(worldRef.current!.goalPos, worldRef.current!.engine);
    });

    worldRef.current.step();

    const nextTicks = currentTicks + 1;
    setCurrentTicks(nextTicks);

    // Periodically update the best brain visualization during simulation
    if (nextTicks % 20 === 0) {
      const sorted = [...evoRef.current.creatures].sort((a, b) => b.fitness - a.fitness);
      setBestBrain(sorted[0].brain.clone());
    }

    if (nextTicks >= TICKS_PER_GEN) {
      const { x, y } = worldRef.current.spawnPos;
      
      // Save best brain of the generation
      const sorted = [...evoRef.current.creatures].sort((a, b) => b.fitness - a.fitness);
      setBestBrain(sorted[0].brain.clone());

      worldRef.current.clearCreatures(evoRef.current.creatures);
      evoRef.current.nextGeneration(x, y);
      worldRef.current.addCreatures(evoRef.current.creatures);
      
      setGeneration(evoRef.current.generation);
      setBestFitness(evoRef.current.bestFitness);
      setCurrentTicks(0);
    } else {
      requestRef.current = requestAnimationFrame(runTick);
    }
  }, [isSimulating, currentTicks]);

  useEffect(() => {
    if (isSimulating) {
      if (currentTicks === 0 && generation === 0) {
        const { x, y } = worldRef.current?.spawnPos || { x: 100, y: 100 };
        evoRef.current.initPopulation(x, y);
        worldRef.current?.addCreatures(evoRef.current.creatures);
        setBestBrain(evoRef.current.creatures[0].brain.clone());
      }
      requestRef.current = requestAnimationFrame(runTick);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isSimulating, runTick, currentTicks, generation]);

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
      setBestBrain(null);
    } else {
      setIsSimulating(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-indigo-500">NEUROEVO</h1>
            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Evolutionary Sandbox</p>
          </div>
          <div className="h-10 w-px bg-slate-800 ml-2" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Tick Progress</span>
            <div className="w-32 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${(currentTicks / TICKS_PER_GEN) * 100}%` }} />
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button 
              onClick={() => setActiveTileType(TileType.WALL)}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${activeTileType === TileType.WALL ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              WALL
            </button>
            <button 
              onClick={() => setActiveTileType(TileType.SPAWN)}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${activeTileType === TileType.SPAWN ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              SPAWN
            </button>
            <button 
              onClick={() => setActiveTileType(TileType.GOAL)}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${activeTileType === TileType.GOAL ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              GOAL
            </button>
            <button 
              onClick={() => setActiveTileType(TileType.EMPTY)}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${activeTileType === TileType.EMPTY ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              ERASER
            </button>
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
            <div 
              ref={simContainerRef} 
              className={`transition-opacity duration-500 ${isSimulating ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}
            />
            
            {!isSimulating && (
              <div 
                className="absolute inset-0 grid gap-0 cursor-crosshair"
                style={{ 
                  gridTemplateColumns: `repeat(${GRID_SIZE}, ${TILE_SIZE}px)`,
                  gridTemplateRows: `repeat(${GRID_SIZE}, ${TILE_SIZE}px)`
                }}
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

        <aside className="w-96 border-l border-slate-800 bg-slate-900/30 p-6 flex flex-col gap-8 overflow-auto">
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4 text-center">Generation Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col items-center">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Current</p>
                <p className="text-3xl font-mono font-black text-indigo-400">{generation}</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col items-center">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Best Fitness</p>
                <p className="text-3xl font-mono font-bold text-green-400">{Math.round(bestFitness)}</p>
              </div>
            </div>
          </section>

          <section className="flex-1 flex flex-col min-h-0">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4 text-center">Best Creature Brain</h3>
            {bestBrain ? (
              <div className="flex-1 min-h-0 overflow-hidden">
                <BrainVisualizer brain={bestBrain} />
              </div>
            ) : (
              <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed flex items-center justify-center text-slate-600 text-xs italic p-12 text-center">
                Start evolution to see neural activity
              </div>
            )}
          </section>

          <section className="mt-auto">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4">Environment</h3>
            <button 
              onClick={() => setGrid(INITIAL_GRID)}
              disabled={isSimulating}
              className="w-full py-3 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              CLEAR BOARD
            </button>
          </section>
        </aside>
      </main>
    </div>
  );
}
