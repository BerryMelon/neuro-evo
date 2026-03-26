import Matter from 'matter-js';
import { GRID_SIZE, TILE_SIZE, TileType, type Grid } from './constants';
import { Creature } from './Creature';

export class SimulationWorld {
  engine: Matter.Engine;
  render: Matter.Render | null = null;
  walls: Matter.Body[] = [];
  goal: Matter.Body | null = null;
  goalPos: { x: number, y: number } = { x: 0, y: 0 };
  spawnPos: { x: number, y: number } = { x: 100, y: 100 };
  container: HTMLElement;
  creatures: Creature[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1 },
      positionIterations: 10,
      velocityIterations: 10
    });
  }

  initRender() {
    this.render = Matter.Render.create({
      element: this.container,
      engine: this.engine,
      options: {
        width: GRID_SIZE * TILE_SIZE,
        height: GRID_SIZE * TILE_SIZE,
        wireframes: false,
        background: '#0f172a'
      }
    });

    Matter.Render.run(this.render);

    // Custom rendering for emojis
    Matter.Events.on(this.render, 'afterRender', () => {
      const context = this.render!.canvas.getContext('2d');
      if (!context) return;

      this.creatures.forEach(creature => {
        // We still draw dead creatures but with lower opacity
        const { x, y } = creature.body.position;
        const angle = creature.body.angle;

        context.save();
        context.translate(x, y);
        context.rotate(angle);

        context.font = `${TILE_SIZE}px serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // Highlight if best (Strong Outline + Glow effect)
        if (creature.isBest && !creature.isDead) {
          context.save();
          context.strokeStyle = 'white';
          context.lineWidth = 6;
          context.strokeText(creature.emoji, 0, 0);
          
          context.shadowBlur = 20;
          context.shadowColor = '#6366f1'; // Indigo-500
          context.strokeText(creature.emoji, 0, 0); // Double stroke for glow intensity
          context.restore();
        }

        context.globalAlpha = creature.isDead ? 0.3 : 1.0;
        
        // Draw emoji
        context.fillText(creature.emoji, 0, 0);
        
        // Draw small health/progress bar if staying on goal
        if (creature.ticksOnGoal > 0 && !creature.hasReachedGoal && !creature.isDead) {
          context.globalAlpha = 1.0;
          context.fillStyle = '#22c55e';
          context.fillRect(-TILE_SIZE/2, -TILE_SIZE, (creature.ticksOnGoal/60) * TILE_SIZE, 3);
        }

        context.restore();
      });
    });
  }

  step() {
    Matter.Engine.update(this.engine, 1000 / 60);
  }

  addCreatures(creatures: Creature[]) {
    this.creatures = creatures;
    const bodies = creatures.map(c => c.body);
    Matter.Composite.add(this.engine.world, bodies);
  }

  clearCreatures(creatures: Creature[]) {
    this.creatures = [];
    const bodies = creatures.map(c => c.body);
    Matter.Composite.remove(this.engine.world, bodies);
  }

  updateGrid(grid: Grid) {
    if (this.walls.length > 0) {
      Matter.Composite.remove(this.engine.world, this.walls);
      this.walls = [];
    }
    if (this.goal) {
      Matter.Composite.remove(this.engine.world, this.goal);
      this.goal = null;
    }

    const newWalls: Matter.Body[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = grid[y][x];
        const posX = x * TILE_SIZE + TILE_SIZE / 2;
        const posY = y * TILE_SIZE + TILE_SIZE / 2;

        if (tile === TileType.WALL) {
          const wall = Matter.Bodies.rectangle(posX, posY, TILE_SIZE, TILE_SIZE, {
            isStatic: true,
            friction: 0.1,
            render: { fillStyle: '#475569' }
          });
          newWalls.push(wall);
        } else if (tile === TileType.GOAL) {
          this.goalPos = { x: posX, y: posY };
          this.goal = Matter.Bodies.rectangle(posX, posY, TILE_SIZE, TILE_SIZE, {
            isStatic: true,
            isSensor: true,
            render: { fillStyle: '#22c55e' }
          });
          Matter.Composite.add(this.engine.world, this.goal);
        } else if (tile === TileType.SPAWN) {
          this.spawnPos = { x: posX, y: posY };
        }
      }
    }

    this.walls = newWalls;
    Matter.Composite.add(this.engine.world, this.walls);
  }

  destroy() {
    if (this.render) {
      Matter.Render.stop(this.render);
      this.render.canvas.remove();
      this.render.textures = {};
    }
    Matter.Engine.clear(this.engine);
  }
}
