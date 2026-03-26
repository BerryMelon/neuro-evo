import Matter from 'matter-js';
import { Genome, CommandType } from './Genome';
import { TILE_SIZE, GRID_SIZE } from './constants';

export class Creature {
  id: string;
  body: Matter.Body;
  genome: Genome;
  fitness: number = 0;
  isDead: boolean = false;
  hasReachedGoal: boolean = false;
  ticksAlive: number = 0;
  initialPos: { x: number, y: number };
  color: string;
  emoji: string;

  // Sequencing state
  currentCommandIndex: number = 0;
  currentCommandTicks: number = 0;
  isOnGround: boolean = false;
  ticksOnGoal: number = 0;
  isBest: boolean = false;

  constructor(id: string, x: number, y: number, genome: Genome, color: string = '#6366f1', emoji: string = '🐌') {
    this.id = id;
    this.genome = genome;
    this.initialPos = { x, y };
    this.color = color;
    this.emoji = emoji;
    
    this.body = Matter.Bodies.rectangle(x, y, TILE_SIZE * 0.9, TILE_SIZE * 0.9, {
      friction: 0.1,
      restitution: 0.2,
      label: 'creature',
      collisionFilter: { group: -1 },
      render: { 
        visible: false // We will render emoji manually or via custom drawing
      }
    });
  }

  update(goalPos: { x: number, y: number }, engine: Matter.Engine) {
    if (this.hasReachedGoal) return;

    this.ticksAlive++;
    
    // 0. Check Boundaries (Out of Bounds = Death)
    const { x, y } = this.body.position;
    const worldWidth = GRID_SIZE * TILE_SIZE;
    const worldHeight = GRID_SIZE * TILE_SIZE;
    
    if (x < 0 || x > worldWidth || y < 0 || y > worldHeight) {
      this.isDead = true;
      this.fitness -= 1000;
      return;
    }

    // 1. If not dead, execute commands
    if (!this.isDead) {
      this.updateGroundStatus(engine);
      this.executeCurrentCommand();
    }

    // 2. Continuous Fitness: Distance & Goal Stay
    const currentDist = Math.sqrt(
      Math.pow(this.body.position.x - goalPos.x, 2) + 
      Math.pow(this.body.position.y - goalPos.y, 2)
    );
    const initialDist = Math.sqrt(
      Math.pow(this.initialPos.x - goalPos.x, 2) + 
      Math.pow(this.initialPos.y - goalPos.y, 2)
    );
    
    // Update basic distance fitness (don't overwrite, just update)
    const distFitness = initialDist - currentDist;

    // Goal stay accumulation (Works even if isDead from sequence end)
    if (currentDist < TILE_SIZE * 1.2) {
      this.ticksOnGoal++;
      this.fitness = distFitness + (this.ticksOnGoal * 100);
    } else {
      this.ticksOnGoal = 0;
      this.fitness = distFitness;
    }
  }

  private updateGroundStatus(engine: Matter.Engine) {
    const sensorPos = { 
      x: this.body.position.x, 
      y: this.body.position.y + TILE_SIZE / 2 + 2 
    };
    const bodies = Matter.Query.point(Matter.Composite.allBodies(engine.world), sensorPos);
    this.isOnGround = bodies.some(b => b.isStatic);
  }

  private executeCurrentCommand() {
    if (this.genome.commands.length === 0) {
      this.isDead = true;
      return;
    }

    const command = this.genome.commands[this.currentCommandIndex];
    if (!command) {
      this.isDead = true;
      return;
    }

    this.currentCommandTicks++;

    const moveForce = 0.001;
    const jumpForce = 0.015;

    switch (command.type) {
      case CommandType.MOVE_LEFT:
        Matter.Body.applyForce(this.body, this.body.position, { x: -moveForce, y: 0 });
        if (this.currentCommandTicks >= command.weight) this.advanceCommand();
        break;
      case CommandType.MOVE_RIGHT:
        Matter.Body.applyForce(this.body, this.body.position, { x: moveForce, y: 0 });
        if (this.currentCommandTicks >= command.weight) this.advanceCommand();
        break;
      case CommandType.WAIT:
        if (this.currentCommandTicks >= command.weight) this.advanceCommand();
        break;
      case CommandType.JUMP_UP:
        if (this.currentCommandTicks === 1) {
          Matter.Body.applyForce(this.body, this.body.position, { x: 0, y: -jumpForce * command.weight });
        } else if (this.currentCommandTicks > 10 && this.isOnGround) {
          this.advanceCommand();
        }
        break;
      case CommandType.JUMP_LEFT:
        if (this.currentCommandTicks === 1) {
          Matter.Body.applyForce(this.body, this.body.position, { x: -jumpForce * 0.5 * command.weight, y: -jumpForce * command.weight });
        } else if (this.currentCommandTicks > 10 && this.isOnGround) {
          this.advanceCommand();
        }
        break;
      case CommandType.JUMP_RIGHT:
        if (this.currentCommandTicks === 1) {
          Matter.Body.applyForce(this.body, this.body.position, { x: jumpForce * 0.5 * command.weight, y: -jumpForce * command.weight });
        } else if (this.currentCommandTicks > 10 && this.isOnGround) {
          this.advanceCommand();
        }
        break;
    }
  }

  private advanceCommand() {
    this.currentCommandIndex++;
    this.currentCommandTicks = 0;
    if (this.currentCommandIndex >= this.genome.commands.length) {
      this.isDead = true;
    }
  }
}
