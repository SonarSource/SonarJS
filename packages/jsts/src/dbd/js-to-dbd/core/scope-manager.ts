import { type BaseValue } from './value';
import { type Constant } from './values/constant';
import type { FunctionInfo } from './function-info';
import { SourceCode } from '@typescript-eslint/utils/ts-eslint';
import { TSESTree } from '@typescript-eslint/typescript-estree';

type ConstantType =
  | 'bigint'
  | 'boolean'
  | 'function'
  | 'null'
  | 'number'
  | 'object'
  | 'RegExp'
  | 'string'
  | 'symbol'
  | 'undefined';

/**
 * Basically analogous to the ECMAScript concept of Execution Context
 */
export interface ScopeManager {
  readonly valueByConstantTypeRegistry: Map<ConstantType, BaseValue<any>>;
  readonly constantRegistry: Map<Constant['value'], Constant>;
  readonly functionInfos: Array<FunctionInfo>;
  createValueIdentifier(): number;
  addFunctionInfo(functionInfo: FunctionInfo): void;
  getScopeId(node: TSESTree.Node): number;
}

export const createScopeManager = (sourceCode: SourceCode): ScopeManager => {
  const { scopes } = sourceCode.scopeManager!;
  let valueIndex = scopes.length;

  const functionInfos: Array<FunctionInfo> = [];
  const valueByConstantTypeRegistry: ScopeManager['valueByConstantTypeRegistry'] = new Map([]);
  const constantRegistry: ScopeManager['constantRegistry'] = new Map([]);

  return {
    functionInfos,
    valueByConstantTypeRegistry,
    createValueIdentifier: () => {
      return valueIndex++;
    },
    constantRegistry,
    addFunctionInfo(functionInfo) {
      functionInfos.push(functionInfo);
    },
    getScopeId(node: TSESTree.Node) {
      return scopes.indexOf(sourceCode.getScope(node));
    },
  };
};
