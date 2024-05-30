import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { type Assignment, createAssignment, createVariable, type Variable } from './variable';
import {
  createFunctionDefinition,
  createNewObjectFunctionDefinition,
  createSetFieldFunctionDefinition,
  generateSignature,
} from './function-definition';
import { createReturnInstruction } from './instructions/return-instruction';
import {
  createFunctionInfo,
  createFunctionInfo as _createFunctionInfo,
  type FunctionInfo,
} from './function-info';
import { createScopeDeclarationInstruction, isTerminated } from './utils';
import { handleStatement as _handleStatement } from './statements';
import { createScopeManager2, type ScopeManager } from './scope-manager';
import { type Scope } from './scope';
import { createCallInstruction } from './instructions/call-instruction';
import { createBranchingInstruction } from './instructions/branching-instruction';
import { createConstant } from './values/constant';
import { createNull, createReference } from './values/reference';
import { createParameter, type Parameter } from './values/parameter';
import { createContext } from './context-manager';
import { createBlockManager } from './block-manager';
import type { Value } from './value';

export type Transpiler = (ast: TSESTree.Program, fileName: string) => Array<FunctionInfo>;

export const createTranspiler = (hostDefinedProperties: Array<Variable> = []): Transpiler => {
  return (program, fileName) => {
    const functionInfos: Array<FunctionInfo> = [];

    const scopeManager = createScopeManager2();

    const processFunctionInfo: ScopeManager['processFunctionInfo'] = (
      name,
      body,
      scopeReference,
      parameters,
      location,
    ) => {
      const blockManager = createBlockManager();

      const { createScope, unshiftScope, createValueIdentifier, shiftScope } = scopeManager;

      // create and declare the outer scope
      // https://262.ecma-international.org/14.0/#sec-global-environment-records
      const outerScope: Scope = createScope();

      unshiftScope(outerScope);

      const outerBlock = blockManager.createBlock(outerScope, location);

      outerBlock.instructions.push(createScopeDeclarationInstruction(outerScope, location));

      // globalThis, a reference to the outer scope itself
      outerBlock.instructions.push(
        createCallInstruction(
          createValueIdentifier(),
          null,
          createSetFieldFunctionDefinition('globalThis'),
          [createReference(outerScope.identifier), createReference(outerScope.identifier)],
          location,
        ),
      );

      // assign global variables to the outer scope and declare them
      const globalVariables: Array<[Variable, Value]> = [
        [createVariable('NaN', 'NaN', false), createNull()],
        [createVariable('Infinity', 'int', false), createNull()],
        [createVariable('undefined', 'Record', false), createNull()],
        ...(hostDefinedProperties.map(property => {
          return [property, createConstant(createValueIdentifier(), property.name)];
        }) as Array<[Variable, Value]>),
      ];

      for (const [globalVariable, value] of globalVariables) {
        const { name } = globalVariable;
        const assignmentIdentifier = createValueIdentifier();

        let assignment: Assignment;

        assignment = createAssignment(assignmentIdentifier, globalVariable);

        outerScope.variables.set(name, globalVariable);
        outerScope.assignments.set(name, assignment);

        outerBlock.instructions.push(
          createCallInstruction(
            assignment.identifier,
            null,
            createSetFieldFunctionDefinition(name),
            [createReference(outerScope.identifier), value],
            location,
          ),
        );
      }

      shiftScope();

      // resolve the function parameters
      const parentScopeName = '@parent';
      const parentScopeParameter = createParameter(
        createValueIdentifier(),
        parentScopeName,
        location,
      );

      const functionParameters: Array<Parameter> = [
        parentScopeParameter,
        ...parameters.map(parameter => {
          let parameterName: string;

          if (parameter.type === AST_NODE_TYPES.Identifier) {
            parameterName = parameter.name;
          } else {
            // todo
            parameterName = '';
          }

          return createParameter(createValueIdentifier(), parameterName, parameter.loc);
        }),
      ];

      // create the function scope
      const functionScope = createScope();

      unshiftScope(functionScope);

      // create the function info
      const functionInfo = createFunctionInfo(
        fileName,
        createFunctionDefinition(name, generateSignature(name, fileName)),
        functionParameters,
        [outerBlock],
        createReference(functionScope.identifier),
        scopeReference,
      );

      // create the first block and branch the outer block to it
      const rootBlock = blockManager.createBlock(functionScope, location);

      outerBlock.instructions.push(createBranchingInstruction(rootBlock, location));

      // create scope instruction
      rootBlock.instructions.push(
        createCallInstruction(
          functionScope.identifier,
          null,
          createNewObjectFunctionDefinition(),
          [],
          location,
        ),
      );

      // create the "bound scope" instruction
      rootBlock.instructions.push(
        createCallInstruction(
          createValueIdentifier(),
          null,
          createSetFieldFunctionDefinition(parentScopeParameter.name),
          [createReference(functionScope.identifier), parentScopeParameter],
          location,
        ),
      );

      const context = createContext(functionInfo, blockManager, scopeManager, processFunctionInfo);

      const { getCurrentBlock, pushBlock } = blockManager;

      const handleStatement = (statement: TSESTree.Statement) => {
        return _handleStatement(statement, context);
      };

      pushBlock(rootBlock);

      // handle the body statements
      body.forEach(handleStatement);

      const currentBlock = getCurrentBlock();

      if (!isTerminated(currentBlock)) {
        currentBlock.instructions.push(createReturnInstruction(createNull(), location));
      }

      functionInfo.blocks.push(...blockManager.blocks);

      functionInfos.push(functionInfo);

      shiftScope();

      return functionInfo;
    };

    processFunctionInfo('main', program.body, null, [], program.loc);

    return functionInfos;
  };
};
