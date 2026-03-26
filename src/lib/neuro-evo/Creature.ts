import Matter from 'matter-js';
import { Brain, NeuronType } from './Brain';
import { TILE_SIZE } from './constants';

export class Creature {
  id: string;
  body: Matter.Body;
  brain: Brain;
  fitness: number = 0;
  isDead: boolean = false;
  hasReachedGoal: boolean = false;
  ticksAlive: number = 0;
  initialPos: { x: number, y: number };
  color: string;

  constructor(id: string, x: number, y: number, brain: Brain, color: string = '#6366f1') {
    this.id = id;
    this.brain = brain;
    this.initialPos = { x, y };
    this.color = color;
    
    this.body = Matter.Bodies.rectangle(x, y, TILE_SIZE * 0.8, TILE_SIZE * 0.8, {
      friction: 0.1,
      restitution: 0.5,
      label: 'creature',
      collisionFilter: {
        group: -1, // Negative group means no collision between bodies in this group
      },
      render: {
        fillStyle: this.color
      }
    });
  }

  update(goalPos: { x: number, y: number }, engine: Matter.Engine) {
    if (this.isDead || this.hasReachedGoal) return;

    this.ticksAlive++;

    // 1. Update Sensors
    this.updateSensors(goalPos, engine);

    // 2. Think
    this.brain.compute();

    // 3. Act
    this.applyActuators();

    // 4. Update Fitness
    const currentDist = Math.sqrt(
      Math.pow(this.body.position.x - goalPos.x, 2) + 
      Math.pow(this.body.position.y - goalPos.y, 2)
    );
    const initialDist = Math.sqrt(
      Math.pow(this.initialPos.x - goalPos.x, 2) + 
      Math.pow(this.initialPos.y - goalPos.y, 2)
    );
    this.fitness = initialDist - currentDist;
  }

  private updateSensors(goalPos: { x: number, y: number }, engine: Matter.Engine) {
    const bias = this.brain.neurons.get('Bias');
    if (bias) bias.value = 1.0;

    const goalX = this.brain.neurons.get('GoalX');
    const goalY = this.brain.neurons.get('GoalY');
    if (goalX) goalX.value = Math.max(-1, Math.min(1, (goalPos.x - this.body.position.x) / 500));
    if (goalY) goalY.value = Math.max(-1, Math.min(1, (goalPos.y - this.body.position.y) / 500));

    const checkTouch = (offsetX: number, offsetY: number) => {
      const sensorPos = { 
        x: this.body.position.x + offsetX, 
        y: this.body.position.y + offsetY 
      };
      const bodies = Matter.Query.point(Matter.Composite.allBodies(engine.world), sensorPos);
      return bodies.some(b => b.isStatic) ? 1.0 : 0.0;
    };

    const tT = this.brain.neurons.get('TouchTop');
    const tB = this.brain.neurons.get('TouchBottom');
    const tL = this.brain.neurons.get('TouchLeft');
    const tR = this.brain.neurons.get('TouchRight');

    if (tT) tT.value = checkTouch(0, -TILE_SIZE / 2 - 2);
    if (tB) tB.value = checkTouch(0, TILE_SIZE / 2 + 2);
    if (tL) tL.value = checkTouch(-TILE_SIZE / 2 - 2, 0);
    if (tR) tR.value = checkTouch(TILE_SIZE / 2 + 2, 0);
  }

  private applyActuators() {
    const force = 0.002;
    const mU = this.brain.neurons.get('MoveUp');
    const mD = this.brain.neurons.get('MoveDown');
    const mL = this.brain.neurons.get('MoveLeft');
    const mR = this.brain.neurons.get('MoveRight');

    if (mU && mU.value > 0.5) Matter.Body.applyForce(this.body, this.body.position, { x: 0, y: -force * mU.value });
    if (mD && mD.value > 0.5) Matter.Body.applyForce(this.body, this.body.position, { x: 0, y: force * mD.value });
    if (mL && mL.value > 0.5) Matter.Body.applyForce(this.body, this.body.position, { x: -force * mL.value, y: 0 });
    if (mR && mR.value > 0.5) Matter.Body.applyForce(this.body, this.body.position, { x: force * mR.value, y: 0 });
  }
}
