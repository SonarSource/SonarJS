import { Block, createBlock } from './block';
import { ScopeManagerClass } from './scope-manager';
import type { Location } from './location';
import { FunctionInfo } from './function-info';

export interface BlockManager {
  getCurrentBlock(): Block;

  pushBlock(block: Block): void;
}

export const createBlockManager = (functionInfo: FunctionInfo): BlockManager => {
  return {
    getCurrentBlock() {
      const { blocks } = functionInfo;

      return blocks[blocks.length - 1];
    },
    pushBlock: block => {
      functionInfo.blocks.push(block);
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
