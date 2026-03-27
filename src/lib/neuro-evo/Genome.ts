export enum CommandType {
  JUMP_LEFT = 'JUMP_LEFT',
  JUMP_RIGHT = 'JUMP_RIGHT',
  JUMP_UP = 'JUMP_UP',
  WAIT = 'WAIT'
}

export interface Command {
  type: CommandType;
  weight: number; // For MOVE/WAIT: duration in ticks. For JUMP: relative force.
}

export class Genome {
  commands: Command[] = [];

  constructor(commands: Command[] = []) {
    this.commands = commands;
  }

  clone(): Genome {
    return new Genome(this.commands.map(c => ({ ...c })));
  }

  static getRandomCommand(): Command {
    const types = Object.values(CommandType);
    const type = types[Math.floor(Math.random() * types.length)];
    
    // For WAIT, weight is duration (ticks 10-100)
    // For JUMP, weight is magnitude (0.5 - 1.5)
    let weight = 1.0;
    if (type === CommandType.WAIT) {
      weight = Math.floor(Math.random() * 90) + 10;
    } else {
      weight = Math.random() + 0.5;
    }

    return { type, weight };
  }
}
