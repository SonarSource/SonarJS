import { Block, createBlock } from './block';
import { ScopeManagerClass } from './scope-manager';
import type { Location } from './location';
import { FunctionInfo } from './function-info';
import type { Scope } from './scope';

export interface BlockManager {
  readonly blocks: Array<Block>;

  createBlock(scope: Scope, location: Location): Block;

  getCurrentBlock(): Block;

  pushBlock(block: Block): void;
}

export const createBlockManager = (): BlockManager => {
  const blocks: Array<Block> = [];

  let blockIndex: number = 0;

  return {
    blocks,
    createBlock: (scope, location): Block => {
      return createBlock(scope, blockIndex++, location);
    },
    getCurrentBlock() {
      return blocks[blocks.length - 1];
    },
    pushBlock: block => {
      blocks.push(block);
    },
  };
};

export class BlockManagerClass {
  blockIndex = 0;

  constructor(
    private readonly scopeManager: ScopeManagerClass,
    private readonly functionInfo: FunctionInfo,
  ) {}

  getCurrentBlock = () => this.functionInfo.blocks[this.functionInfo.blocks.length - 1];
  createBlockIdentifier = () => {
    const result = this.blockIndex;
    this.blockIndex++;
    return result;
  };
  push = (block: Block) => this.functionInfo.blocks.push(block);
  createScopedBlock = (location: Location): Block => {
    return createBlock(this.scopeManager.getCurrentScope(), this.createBlockIdentifier(), location);
  };
}
