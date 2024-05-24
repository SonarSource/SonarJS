import { ScopeManager } from './scope-manager';
import { BlockManager } from './block-manager';
import { FunctionInfo } from './function-info';

export class ContextManager {
  private blockManager: BlockManager;
  private scopeManager: ScopeManager;

  constructor(private functionInfo: FunctionInfo) {
    this.scopeManager = new ScopeManager();
    this.blockManager = new BlockManager(this.scopeManager, this.functionInfo);
  }

  get scope(): ScopeManager {
    return this.scopeManager;
  }

  get block(): BlockManager {
    return this.blockManager;
  }
}
