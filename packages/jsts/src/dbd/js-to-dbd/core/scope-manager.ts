import { type BaseValue } from './value';
import { type Constant } from './values/constant';
import type { FunctionInfo } from './function-info';
import { Scope, SourceCode } from '@typescript-eslint/utils/ts-eslint';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import { createReference } from './values/reference';
import { createFunctionDefinition, FunctionDefinition } from './function-definition';

export type Record = BaseValue<any> | typeof unresolvable;

export type BaseReferenceRecord = {
  referencedName: string;
};

function getVariableFromIdentifier(sourceCode: SourceCode, node: TSESTree.Identifier) {
  let scope: Scope.Scope | null = sourceCode.getScope(node);
  while (scope != null) {
    const variable = scope.variables.find(value => value.name === node.name);
    if (variable) {
      return variable;
    }
    scope = scope.upper;
  }
}

function getDefinitionFromIdentifier(sourceCode: SourceCode, node: TSESTree.Identifier) {
  const variable = getVariableFromIdentifier(sourceCode, node);
  if (!variable) {
    return undefined;
  }
  const defs = [...variable.defs];
  defs.reverse();
  return defs.find(value => {
    return (
      value.name.type === 'Identifier' &&
      value.name.name === node.name &&
      value.name.range[0] <= node.range[0]
    );
  });
}

function getFunctionDefinition(sourceCode: SourceCode, callee: TSESTree.LeftHandSideExpression) {
  const services = sourceCode.parserServices;
  if (!services) {
    return undefined;
  }
  const tsNode = services.esTreeNodeToTSNodeMap?.get(callee);
  const program = services.program;

  if (!program || !tsNode) {
    return undefined;
  }
  const type = program.getTypeChecker().getTypeAtLocation(tsNode);
  if (type?.symbol) {
    const declaration = type.symbol.declarations?.[0];
    const filename = declaration?.getSourceFile()?.fileName;
    //const { members: _members, valueDeclaration } = type.symbol;
    return createFunctionDefinition(filename!, 'na');
  }
}

function isParameter(sourceCode: SourceCode, node: TSESTree.Identifier): boolean {
  return getDefinitionFromIdentifier(sourceCode, node)?.type === 'Parameter';
}

export type ResolvableReferenceRecord = BaseReferenceRecord & {
  base: BaseValue<any>;
  variable: Scope.Variable;
};

export type UnresolvableReferenceRecord = BaseReferenceRecord & {
  base: typeof unresolvable;
};

export type ReferenceRecord = ResolvableReferenceRecord | UnresolvableReferenceRecord;

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
  readonly fileName: string;
  readonly valueByConstantTypeRegistry: Map<ConstantType, BaseValue<any>>;
  readonly constantRegistry: Map<Constant['value'], Constant>;
  readonly functionInfos: Array<FunctionInfo>;
  createValueIdentifier(): number;
  addFunctionInfo(functionInfo: FunctionInfo): void;
  getScopeId(scope: Scope.Scope): number;
  getScope(node: TSESTree.NodeOrTokenData): Scope.Scope;
  getIdentifierReference(node: TSESTree.Identifier): ReferenceRecord;
  getVariableFromIdentifier(node: TSESTree.Identifier): Scope.Variable | undefined;
  getDefinitionFromIdentifier(node: TSESTree.Identifier): Scope.Definition | undefined;
  isParameter(node: TSESTree.Identifier): boolean;
  isModule(): boolean;
  getFunctionDefinition(node: TSESTree.LeftHandSideExpression): FunctionDefinition;
}
export const unresolvable = Symbol();

export const createScopeManager = (sourceCode: SourceCode, fileName: string): ScopeManager => {
  const { scopes } = sourceCode.scopeManager!;
  let valueIndex = scopes.length;

  const createValueIdentifier = () => valueIndex++;

  const functionInfos: Array<FunctionInfo> = [];
  const valueByConstantTypeRegistry: ScopeManager['valueByConstantTypeRegistry'] = new Map([]);
  const constantRegistry: ScopeManager['constantRegistry'] = new Map([]);

  return {
    fileName,
    functionInfos,
    valueByConstantTypeRegistry,
    createValueIdentifier,
    constantRegistry,
    addFunctionInfo(functionInfo) {
      functionInfos.push(functionInfo);
    },
    getScopeId(scope: Scope.Scope) {
      return scopes.indexOf(scope);
    },
    getScope(node: TSESTree.Node) {
      return sourceCode.getScope(node);
    },
    getIdentifierReference(node: TSESTree.Identifier) {
      const variable = getVariableFromIdentifier(sourceCode, node);
      if (variable) {
        return {
          base: createReference(createValueIdentifier()),
          variable,
          referencedName: node.name,
        };
      }
      return {
        base: unresolvable,
        referencedName: node.name,
      };
    },
    getVariableFromIdentifier: node => getVariableFromIdentifier(sourceCode, node),
    getDefinitionFromIdentifier: node => getDefinitionFromIdentifier(sourceCode, node),
    isParameter: node => isParameter(sourceCode, node),
    isModule: () => {
      return sourceCode.scopeManager!.isModule();
    },
    getFunctionDefinition(node: TSESTree.LeftHandSideExpression): FunctionDefinition {
      return getFunctionDefinition(sourceCode, node)!;
    },
  };
};
