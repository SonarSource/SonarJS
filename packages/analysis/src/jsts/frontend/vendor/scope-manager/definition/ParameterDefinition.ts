import type { TSESTree } from '../../types/index.js';

import { DefinitionBase } from './DefinitionBase.js';
import { DefinitionType } from './DefinitionType.js';

export class ParameterDefinition extends DefinitionBase<
  DefinitionType.Parameter,
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.TSCallSignatureDeclaration
  | TSESTree.TSConstructorType
  | TSESTree.TSConstructSignatureDeclaration
  | TSESTree.TSDeclareFunction
  | TSESTree.TSEmptyBodyFunctionExpression
  | TSESTree.TSFunctionType
  | TSESTree.TSMethodSignature,
  null,
  TSESTree.BindingName
> {
  /**
   * Whether the parameter definition is a part of a rest parameter.
   */
  public readonly isTypeDefinition = false;
  public readonly isVariableDefinition = true;
  public readonly rest: boolean;

  constructor(name: TSESTree.BindingName, node: ParameterDefinition['node'], rest: boolean) {
    super(DefinitionType.Parameter, name, node, null);
    this.rest = rest;
  }
}
