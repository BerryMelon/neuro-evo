import Matter from 'matter-js';
import { Genome, CommandType } from './Genome';
import { TILE_SIZE } from './constants';

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

  // Sequencing state
  currentCommandIndex: number = 0;
  currentCommandTicks: number = 0;
  isOnGround: boolean = false;

  constructor(id: string, x: number, y: number, genome: Genome, color: string = '#6366f1') {
    this.id = id;
    this.genome = genome;
    this.initialPos = { x, y };
    this.color = color;
    
    this.body = Matter.Bodies.rectangle(x, y, TILE_SIZE * 0.8, TILE_SIZE * 0.8, {
      friction: 0.1,
      restitution: 0.2, // Lower restitution for stability
      label: 'creature',
      collisionFilter: { group: -1 },
      render: { fillStyle: this.color }
    });
  }

  update(goalPos: { x: number, y: number }, engine: Matter.Engine) {
    if (this.isDead || this.hasReachedGoal) return;

    this.ticksAlive++;
    
    // 1. Check ground status
    this.updateGroundStatus(engine);

    // 2. Execute current command
    this.executeCurrentCommand();

    // 3. Update Fitness (distance to goal)
    const currentDist = Math.sqrt(
      Math.pow(this.body.position.x - goalPos.x, 2) + 
      Math.pow(this.body.position.y - goalPos.y, 2)
    );
    const initialDist = Math.sqrt(
      Math.pow(this.initialPos.x - goalPos.x, 2) + 
      Math.pow(this.initialPos.y - goalPos.y, 2)
    );
    
    // Simple fitness: progress made toward goal
    this.fitness = initialDist - currentDist;

    // Check goal reach
    if (currentDist < TILE_SIZE) {
      this.hasReachedGoal = true;
      this.fitness += 1000; // Bonus for reaching
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
    
    // If we finished the sequence, the creature stays still (is considered finished/dead for simulation)
    if (this.currentCommandIndex >= this.genome.commands.length) {
      this.isDead = true;
    }
  }
}
