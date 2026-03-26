export enum NeuronType {
  INPUT = 'INPUT',
  HIDDEN = 'HIDDEN',
  OUTPUT = 'OUTPUT'
}

export interface Connection {
  from: string;
  to: string;
  weight: number;
}

export class Neuron {
  id: string;
  type: NeuronType;
  value: number = 0;
  label: string;

  constructor(id: string, type: NeuronType, label: string = '') {
    this.id = id;
    this.type = type;
    this.label = label || id;
  }
}

export class Brain {
  neurons: Map<string, Neuron> = new Map();
  connections: Connection[] = [];

  constructor() {
    this.initDefaultNeurons();
  }

  private initDefaultNeurons() {
    // Inputs
    this.addNeuron(new Neuron('TouchTop', NeuronType.INPUT, 'Touch Top'));
    this.addNeuron(new Neuron('TouchBottom', NeuronType.INPUT, 'Touch Bottom'));
    this.addNeuron(new Neuron('TouchLeft', NeuronType.INPUT, 'Touch Left'));
    this.addNeuron(new Neuron('TouchRight', NeuronType.INPUT, 'Touch Right'));
    this.addNeuron(new Neuron('GoalX', NeuronType.INPUT, 'Goal X Dist'));
    this.addNeuron(new Neuron('GoalY', NeuronType.INPUT, 'Goal Y Dist'));
    this.addNeuron(new Neuron('Bias', NeuronType.INPUT, 'Bias'));

    // Outputs
    this.addNeuron(new Neuron('MoveUp', NeuronType.OUTPUT, 'Move Up'));
    this.addNeuron(new Neuron('MoveDown', NeuronType.OUTPUT, 'Move Down'));
    this.addNeuron(new Neuron('MoveLeft', NeuronType.OUTPUT, 'Move Left'));
    this.addNeuron(new Neuron('MoveRight', NeuronType.OUTPUT, 'Move Right'));
  }

  addNeuron(neuron: Neuron) {
    this.neurons.set(neuron.id, neuron);
  }

  addConnection(from: string, to: string, weight: number) {
    this.connections.push({ from, to, weight });
  }

  /**
   * Process one tick of the neural network
   */
  compute() {
    const nextValues = new Map<string, number>();

    // Reset hidden and output neurons for accumulation
    for (const neuron of this.neurons.values()) {
      if (neuron.type !== NeuronType.INPUT) {
        nextValues.set(neuron.id, 0);
      } else {
        nextValues.set(neuron.id, neuron.value);
      }
    }

    // Sum weighted inputs for each connection
    for (const conn of this.connections) {
      const fromNeuron = this.neurons.get(conn.from);
      const currentVal = nextValues.get(conn.to) || 0;
      if (fromNeuron) {
        nextValues.set(conn.to, currentVal + (fromNeuron.value * conn.weight));
      }
    }

    // Apply activation function (tanh) to hidden and output neurons
    for (const neuron of this.neurons.values()) {
      if (neuron.type !== NeuronType.INPUT) {
        const raw = nextValues.get(neuron.id) || 0;
        neuron.value = Math.tanh(raw);
      }
    }
  }

  clone(): Brain {
    const newBrain = new Brain();
    newBrain.neurons = new Map();
    for (const [id, n] of this.neurons.entries()) {
      const clonedN = new Neuron(n.id, n.type, n.label);
      clonedN.value = n.value;
      newBrain.neurons.set(id, clonedN);
    }
    newBrain.connections = this.connections.map(c => ({ ...c }));
    return newBrain;
  }
}
