import { type BaseValue } from './value';
import { type Constant } from './values/constant';
import type { FunctionInfo } from './function-info';
import { Scope, SourceCode } from '@typescript-eslint/utils/ts-eslint';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { createReference } from './values/reference';
import { createFunctionDefinitionFromName, FunctionDefinition } from './function-definition';
import { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';

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

function getFunctionDefinition(sourceCode: SourceCode, node: TSESTree.Node) {
  if (node.type === AST_NODE_TYPES.FunctionDeclaration && node.id) {
    node = node.id;
  } else if (node.parent && node.parent.type === AST_NODE_TYPES.Property) {
    node = node.parent.key;
  }
  const services: ParserServicesWithTypeInformation =
    sourceCode.parserServices as unknown as ParserServicesWithTypeInformation;
  let filename = 'unknown';
  let name = node.type === AST_NODE_TYPES.Identifier ? node.name : 'unknown';

  if (!services) {
    return createFunctionDefinitionFromName(name, filename);
  }
  const tsNode = services.esTreeNodeToTSNodeMap?.get(node);
  const program = services.program;

  if (!program || !tsNode) {
    return createFunctionDefinitionFromName(name, filename);
  }
  let symbol = services.getSymbolAtLocation(node);

  if (symbol) {
    while (!symbolIsFunction(symbol) && getLinkedSymbol(symbol)) {
      symbol = getLinkedSymbol(symbol);
      if (symbol) {
        symbol = getLinkedSymbol(symbol);
      }
    }
    filename = symbol.declarations?.[0]?.getSourceFile()?.fileName ?? filename;
    const symbolId = getSymbolId(symbol);
    if (symbolId) {
      name = `${symbolId}_${symbol.getName()}`;
    }
  }
  return createFunctionDefinitionFromName(name, filename);
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
  getFunctionDefinition(node: TSESTree.Node): FunctionDefinition;
  getParserServices(): ParserServicesWithTypeInformation;
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
    getFunctionDefinition(node: TSESTree.Node): FunctionDefinition {
      return getFunctionDefinition(sourceCode, node)!;
    },
    getParserServices() {
      return sourceCode.parserServices as unknown as ParserServicesWithTypeInformation;
    },
  };
};

function getLinkedSymbol(symbol: ts.Symbol) {
  return ((symbol as any).links?.type as ts.Type)?.symbol;
}

function getSymbolId(symbol: ts.Symbol) {
  return (symbol as any).id;
}

function symbolIsFunction(symbol: ts.Symbol) {
  return !(symbol.flags & ts.SymbolFlags.Function);
}
