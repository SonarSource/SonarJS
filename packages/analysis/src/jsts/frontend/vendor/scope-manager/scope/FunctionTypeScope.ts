import type { TSESTree } from '../../types/index.js';

import type { ScopeManager } from '../ScopeManager.js';
import type { Scope } from './Scope.js';

import { ScopeBase } from './ScopeBase.js';
import { ScopeType } from './ScopeType.js';

export class FunctionTypeScope extends ScopeBase<
  ScopeType.functionType,
  | TSESTree.TSCallSignatureDeclaration
  | TSESTree.TSConstructorType
  | TSESTree.TSConstructSignatureDeclaration
  | TSESTree.TSFunctionType
  | TSESTree.TSMethodSignature,
  Scope
> {
  constructor(
    scopeManager: ScopeManager,
    upperScope: FunctionTypeScope['upper'],
    block: FunctionTypeScope['block'],
  ) {
    super(scopeManager, ScopeType.functionType, upperScope, block, false);
  }
}
