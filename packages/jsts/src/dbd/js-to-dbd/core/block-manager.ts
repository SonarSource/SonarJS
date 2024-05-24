import { Block, createBlock } from './block';
import { ScopeManager } from './scope-manager';
import type { Location } from './location';
import { FunctionInfo } from './function-info';

export class BlockManager {
  blockIndex = 0;

  constructor(
    private scopeManager: ScopeManager,
    private functionInfo: FunctionInfo,
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
