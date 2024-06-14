import { Block, createBlock } from './block';
import {
  createFunctionDefinitionFromName,
  createGetFieldFunctionDefinition,
  createNewObjectFunctionDefinition,
  createSetFieldFunctionDefinition,
  FunctionDefinition,
} from './function-definition';
import { createParameter, Parameter } from './values/parameter';
import { createScopeDeclarationInstruction, isTerminated } from './utils';
import { createCallInstruction } from './instructions/call-instruction';
import { createReference } from './values/reference';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { handleStatement } from './statements';
import { createReturnInstruction } from './instructions/return-instruction';
import { createNull } from './values/constant';
import { ScopeManager } from './scope-manager';
import type { Location } from './location';
import { Instruction } from './instruction';
import { createBranchingInstruction } from './instructions/branching-instruction';
import { Value } from './value';

export type FunctionInfo = {
  readonly scopeId: number;
  readonly scopeManager: ScopeManager;
  readonly fileName: string;
  readonly blocks: Array<Block>;
  readonly definition: FunctionDefinition;
  readonly parameters: Array<Parameter>;
  readonly functionCalls: Set<string>;
  readonly exportedObject: Map<string, Value>;
  readonly importedFiles: Map<string, Value>;

  createBlock(location: Location): Block;
  getCurrentBlock(): Block;
  pushBlock(block: Block): void;
  addInstructions(instructions: Array<Instruction>): void;
  addFunctionCall(callSignature: FunctionDefinition): void;
  addDefaultExport(value: Value): void;
  addExport(key: string, value: Value): void;
  addImport(filename: string, value: Value): void;
  getImport(filename: string): Value;
  hasImport(filename: string): boolean;
  createReturnInstruction(value: Value, loc: Location): void;
};

export const createFunctionInfo = <T extends TSESTree.FunctionLike | TSESTree.Program>(
  name: string,
  node: T,
  scopeManager: ScopeManager,
): FunctionInfo => {
  let blockIndex: number = 0;
  const blocks: Array<Block> = [];
  const location = node.loc;
  // create the main function block
  const currentScope = scopeManager.getScope(node);
  const scopeId = scopeManager.getScopeId(currentScope);
  const functionInfo: FunctionInfo = {
    scopeId,
    scopeManager,
    fileName: scopeManager.fileName,
    definition:
      node.type !== AST_NODE_TYPES.Program
        ? scopeManager.getFunctionDefinition(node)
        : createFunctionDefinitionFromName(name, scopeManager.fileName),
    blocks,
    parameters: [],
    functionCalls: new Set(),
    exportedObject: new Map(),
    importedFiles: new Map(),
    addFunctionCall: functionDefinition => {
      functionInfo.functionCalls.add(functionDefinition.signature);
    },
    createBlock: location => {
      return createBlock(blockIndex++, location);
    },
    getCurrentBlock() {
      return blocks[blocks.length - 1];
    },
    pushBlock: block => {
      blocks.push(block);
    },
    addInstructions: instructions => {
      blocks[blocks.length - 1].instructions.push(...instructions);
    },
    addDefaultExport: value => {
      functionInfo.exportedObject.set('default', value);
    },
    addExport: (key: string, value: Value) => {
      functionInfo.exportedObject.set(key, value);
    },
    addImport: (fileName, value) => {
      functionInfo.importedFiles.set(fileName, value);
    },
    hasImport: fileName => {
      return functionInfo.importedFiles.has(fileName);
    },
    getImport(filename: string): Value {
      return functionInfo.importedFiles.get(filename)!;
    },
    createReturnInstruction(value: Value, loc: Location) {
      functionInfo.addInstructions([
        createCallInstruction(
          scopeManager.createValueIdentifier(),
          null,
          createSetFieldFunctionDefinition('@return'),
          [returnReference, value],
          loc,
        ),
        createReturnInstruction(returnReference, node.loc),
      ]);
    },
  };
  functionInfo.pushBlock(functionInfo.createBlock(location));
  // add the scope creation instruction
  functionInfo.addInstructions([createScopeDeclarationInstruction(scopeId, location)]);

  // Initialize the returnObject
  const returnReference = createReference(scopeManager.createValueIdentifier());
  functionInfo.addInstructions([
    createCallInstruction(
      returnReference.identifier,
      null,
      createNewObjectFunctionDefinition(),
      [],
      location,
    ),
  ]);

  if (node.type !== AST_NODE_TYPES.Program) {
    // prepare local scope in return object
    functionInfo.addInstructions([
      createCallInstruction(
        scopeManager.createValueIdentifier(),
        null,
        createSetFieldFunctionDefinition('@scope'),
        [returnReference, createReference(scopeId)],
        location,
      ),
    ]);

    const parentScopeName = '@parent';
    const parentReference = createParameter(
      scopeManager.createValueIdentifier(),
      parentScopeName,
      location,
    );
    functionInfo.parameters.push(parentReference);

    // resolve the function parameters
    const functionParametersName = '@params';
    const functionParametersReference = createParameter(
      scopeManager.createValueIdentifier(),
      functionParametersName,
      location,
    );
    functionInfo.parameters.push(functionParametersReference);

    const parentScopeReference = scopeManager.createValueIdentifier();
    // add the "set parent" instruction
    functionInfo.addInstructions([
      createCallInstruction(
        parentScopeReference,
        null,
        createSetFieldFunctionDefinition('@parent'),
        [createReference(scopeId), parentReference],
        location,
      ),
    ]);

    let pointerScope = currentScope;
    while (pointerScope.upper) {
      const parentScope = pointerScope.upper;
      functionInfo.addInstructions([
        createCallInstruction(
          scopeManager.getScopeId(parentScope),
          null,
          createGetFieldFunctionDefinition('@parent'),
          [createReference(scopeManager.getScopeId(pointerScope))],
          location,
        ),
      ]);
      pointerScope = parentScope;
    }
  } else {
    setGlobals(functionInfo, location, scopeId);
    // create the main function block
    const mainBlock = functionInfo.createBlock(location);
    functionInfo.addInstructions([createBranchingInstruction(mainBlock, location)]);
    functionInfo.pushBlock(mainBlock);

    // branch the global block to the main block

    if (scopeManager.isModule()) {
      // TODO: Check for a more solid approach to get a moduleId
      const moduleScopeId = 1;
      mainBlock.instructions.push(createScopeDeclarationInstruction(moduleScopeId, location));
      mainBlock.instructions.push(
        createCallInstruction(
          scopeManager.createValueIdentifier(),
          null,
          createSetFieldFunctionDefinition('@parent'),
          [createReference(moduleScopeId), createReference(0)],
          location,
        ),
      );
    }

    // prepare local scope in return object
    functionInfo.addInstructions([
      createCallInstruction(
        scopeManager.createValueIdentifier(),
        null,
        createSetFieldFunctionDefinition('@scope'),
        [returnReference, createReference(scopeManager.getTopLevelScopeId())],
        location,
      ),
    ]);
  }

  // handle the body statements
  getBody(node).forEach((statement: TSESTree.Statement) => {
    return handleStatement(statement, functionInfo);
  });

  const lastBlock = functionInfo.getCurrentBlock();

  if (!isTerminated(lastBlock)) {
    if (node.type === AST_NODE_TYPES.Program) {
      const returnValue = createReference(scopeManager.createValueIdentifier());
      functionInfo.addInstructions([
        createCallInstruction(
          returnValue.identifier,
          null,
          createNewObjectFunctionDefinition(),
          [],
          location,
        ),
      ]);
      functionInfo.addInstructions(
        Array.from(functionInfo.exportedObject).map(item => {
          const [key, value] = item;
          return createCallInstruction(
            scopeManager.createValueIdentifier(),
            null,
            createSetFieldFunctionDefinition(key),
            [returnValue, value],
            location, // TODO: improve to correctly link to the export
          );
        }),
      );
      functionInfo.createReturnInstruction(returnValue, location);
    } else {
      functionInfo.createReturnInstruction(createNull(), location);
    }
  }

  scopeManager.addFunctionInfo(functionInfo);

  return functionInfo;
};

function getBody(node: TSESTree.FunctionLike | TSESTree.Program): TSESTree.ProgramStatement[] {
  switch (node.type) {
    case AST_NODE_TYPES.Program:
      return node.body;
    case AST_NODE_TYPES.FunctionDeclaration:
      return node.body.body;
    case AST_NODE_TYPES.ArrowFunctionExpression:
      if (node.body.type === AST_NODE_TYPES.BlockStatement) {
        return node.body.body;
      } else {
        return [
          {
            type: AST_NODE_TYPES.ExpressionStatement,
            expression: node.body,
            loc: node.loc,
            range: node.range,
            directive: undefined,
            parent: node,
          },
        ];
      }
    default:
      throw new Error(`Type ${node.type} is not yet supported`);
  }
}

function setGlobals(
  functionInfo: FunctionInfo,
  location: TSESTree.SourceLocation,
  scopeId: number,
) {
  // globalThis is a reference to the outer scope itself
  functionInfo.addInstructions([
    createCallInstruction(
      functionInfo.scopeManager.createValueIdentifier(),
      null,
      createSetFieldFunctionDefinition('globalThis'),
      [createReference(scopeId), createReference(scopeId)],
      location,
    ),
  ]);
}

function getFunctionName(
  functionReferenceIdentifier: number,
  identifier: TSESTree.Identifier | null,
  functionInfo: FunctionInfo,
) {
  if (identifier) {
    const { name } = identifier;
    if (functionInfo.definition.name === 'main') {
      return name;
    }
    return `${functionInfo.definition.name}__${name}__${functionReferenceIdentifier}`;
  }
  return `${functionInfo.definition.name}__${functionReferenceIdentifier}`;
}

export function handleFunctionLike(node: TSESTree.FunctionLike, functionInfo: FunctionInfo) {
  const { addInstructions, scopeManager } = functionInfo;
  const { createValueIdentifier } = scopeManager;

  const functionReferenceIdentifier = createValueIdentifier();
  const functionReference = createReference(functionReferenceIdentifier);
  const functionName = getFunctionName(functionReferenceIdentifier, node.id, functionInfo);
  createFunctionInfo(functionName, node, scopeManager);

  // create the function object
  addInstructions([
    createCallInstruction(
      functionReferenceIdentifier,
      null,
      createNewObjectFunctionDefinition(),
      [],
      node.loc,
    ),
  ]);
  if (node.id) {
    const parentScope = functionInfo.scopeManager.getScope(node).upper!;
    const parentScopeId = functionInfo.scopeManager.getScopeId(parentScope);
    addInstructions([
      createCallInstruction(
        createValueIdentifier(),
        null,
        createSetFieldFunctionDefinition(node.id.name),
        [createReference(parentScopeId), functionReference],
        node.loc,
      ),
    ]);
  }
  return functionReference;
}
