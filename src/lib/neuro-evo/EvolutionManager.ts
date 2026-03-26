import { Brain, Neuron, NeuronType } from './Brain';
import { Creature } from './Creature';

export class EvolutionManager {
  populationSize: number = 50;
  mutationRate: number = 0.1;
  generation: number = 0;
  creatures: Creature[] = [];
  bestFitness: number = -Infinity;

  constructor(size: number = 50) {
    this.populationSize = size;
  }

  private getRandomColor() {
    const colors = [
      '#6366f1', '#f43f5e', '#22c55e', '#eab308', '#a855f7', 
      '#06b6d4', '#f97316', '#ec4899', '#8b5cf6', '#10b981'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  initPopulation(startX: number, startY: number, seedBrain?: Brain) {
    this.creatures = [];
    this.generation = 0;
    this.bestFitness = -Infinity;

    for (let i = 0; i < this.populationSize; i++) {
      const brain = seedBrain ? seedBrain.clone() : new Brain();
      if (!seedBrain) {
        this.randomizeBrain(brain);
      } else if (i > 0) {
        this.mutateBrain(brain);
      }
      this.creatures.push(new Creature(`c-${i}`, startX, startY, brain, this.getRandomColor()));
    }
  }

  private randomizeBrain(brain: Brain) {
    const inputs = Array.from(brain.neurons.values()).filter(n => n.type === NeuronType.INPUT);
    const outputs = Array.from(brain.neurons.values()).filter(n => n.type === NeuronType.OUTPUT);

    for (const input of inputs) {
      for (const output of outputs) {
        if (Math.random() < 0.3) {
          brain.addConnection(input.id, output.id, (Math.random() * 2 - 1));
        }
      }
    }
  }

  private mutateBrain(brain: Brain) {
    for (const conn of brain.connections) {
      if (Math.random() < this.mutationRate) {
        conn.weight += (Math.random() * 0.4 - 0.2);
        conn.weight = Math.max(-2, Math.min(2, conn.weight));
      }
    }

    if (Math.random() < 0.05) {
      const neurons = Array.from(brain.neurons.values());
      const from = neurons[Math.floor(Math.random() * neurons.length)];
      const to = neurons[Math.floor(Math.random() * neurons.length)];
      if (to.type !== NeuronType.INPUT && from.type !== NeuronType.OUTPUT) {
        brain.addConnection(from.id, to.id, (Math.random() * 2 - 1));
      }
    }

    if (Math.random() < 0.02) {
      const id = `H-${Math.random().toString(36).substr(2, 5)}`;
      brain.addNeuron(new Neuron(id, NeuronType.HIDDEN, 'Hidden'));
    }
  }

  nextGeneration(startX: number, startY: number) {
    this.creatures.sort((a, b) => b.fitness - a.fitness);
    this.bestFitness = this.creatures[0].fitness;
    this.generation++;

    const topPerformers = this.creatures.slice(0, Math.ceil(this.populationSize * 0.1));
    const nextGen: Creature[] = [];

    for (let i = 0; i < topPerformers.length; i++) {
      const eliteBrain = topPerformers[i].brain.clone();
      nextGen.push(new Creature(`c-elite-${i}`, startX, startY, eliteBrain, topPerformers[i].color));
    }

    while (nextGen.length < this.populationSize) {
      const parent = topPerformers[Math.floor(Math.random() * topPerformers.length)];
      const childBrain = parent.brain.clone();
      this.mutateBrain(childBrain);
      nextGen.push(new Creature(`c-${nextGen.length}`, startX, startY, childBrain, parent.color));
    }

    this.creatures = nextGen;
  }
}
