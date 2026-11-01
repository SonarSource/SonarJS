import type { TSESTree } from '../../types/index.js';

import type { ScopeManager } from '../ScopeManager.js';
import type { Scope } from './Scope.js';

import { ScopeBase } from './ScopeBase.js';
import { ScopeType } from './ScopeType.js';

export class TypeScope extends ScopeBase<
  ScopeType.type,
  TSESTree.TSInterfaceDeclaration | TSESTree.TSTypeAliasDeclaration,
  Scope
> {
  constructor(
    scopeManager: ScopeManager,
    upperScope: TypeScope['upper'],
    block: TypeScope['block'],
  ) {
    super(scopeManager, ScopeType.type, upperScope, block, false);
  }
}
