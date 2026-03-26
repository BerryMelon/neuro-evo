import { Genome, Command, CommandType } from './Genome';
import { Creature } from './Creature';

export class EvolutionManager {
  populationSize: number = 50;
  mutationRate: number = 0.2;
  generation: number = 0;
  creatures: Creature[] = [];
  bestFitness: number = -Infinity;

  constructor(size: number = 50) {
    this.populationSize = size;
  }

  private getRandomColor() {
    const colors = ['#6366f1', '#f43f5e', '#22c55e', '#eab308', '#a855f7', '#06b6d4', '#f97316'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  initPopulation(startX: number, startY: number, seedGenome?: Genome) {
    this.creatures = [];
    this.generation = 0;
    this.bestFitness = -Infinity;

    for (let i = 0; i < this.populationSize; i++) {
      const genome = seedGenome ? seedGenome.clone() : this.generateRandomGenome();
      if (seedGenome && i > 0) {
        this.mutateGenome(genome);
      }
      this.creatures.push(new Creature(`c-${i}`, startX, startY, genome, this.getRandomColor()));
    }
  }

  private generateRandomGenome(): Genome {
    const commands: Command[] = [];
    const len = Math.floor(Math.random() * 5) + 3; // Start with 3-8 commands
    for (let i = 0; i < len; i++) {
      commands.push(Genome.getRandomCommand());
    }
    return new Genome(commands);
  }

  private mutateGenome(genome: Genome) {
    // 1. Weight Mutation
    genome.commands.forEach(cmd => {
      if (Math.random() < this.mutationRate) {
        const factor = 1 + (Math.random() * 0.4 - 0.2); // +/- 20%
        cmd.weight *= factor;
        cmd.weight = Math.max(0.1, Math.min(200, cmd.weight));
      }
    });

    // 2. Type Mutation
    if (Math.random() < 0.1 && genome.commands.length > 0) {
      const idx = Math.floor(Math.random() * genome.commands.length);
      const newCmd = Genome.getRandomCommand();
      genome.commands[idx].type = newCmd.type;
    }

    // 3. Insertion
    if (Math.random() < 0.05) {
      const idx = Math.floor(Math.random() * (genome.commands.length + 1));
      genome.commands.splice(idx, 0, Genome.getRandomCommand());
    }

    // 4. Deletion
    if (Math.random() < 0.05 && genome.commands.length > 2) {
      const idx = Math.floor(Math.random() * genome.commands.length);
      genome.commands.splice(idx, 1);
    }

    // 5. Shuffle
    if (Math.random() < 0.02) {
      genome.commands.sort(() => Math.random() - 0.5);
    }
  }

  nextGeneration(startX: number, startY: number) {
    this.creatures.sort((a, b) => b.fitness - a.fitness);
    this.bestFitness = this.creatures[0].fitness;
    this.generation++;

    const topPerformers = this.creatures.slice(0, Math.ceil(this.populationSize * 0.1));
    const nextGen: Creature[] = [];

    // Elitism
    for (let i = 0; i < topPerformers.length; i++) {
      nextGen.push(new Creature(`elite-${i}`, startX, startY, topPerformers[i].genome.clone(), topPerformers[i].color));
    }

    // Reproduction
    while (nextGen.length < this.populationSize) {
      const parent = topPerformers[Math.floor(Math.random() * topPerformers.length)];
      const childGenome = parent.genome.clone();
      this.mutateGenome(childGenome);
      nextGen.push(new Creature(`c-${nextGen.length}`, startX, startY, childGenome, parent.color));
    }

    this.creatures = nextGen;
  }
}
