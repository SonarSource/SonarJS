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
import { createScopeManager, type ScopeManager } from './scope-manager';
import { type Scope } from './scope';
import { createCallInstruction } from './instructions/call-instruction';
import { createBranchingInstruction } from './instructions/branching-instruction';
import { createConstant } from './values/constant';
import { createNull, createReference } from './values/reference';
import { createParameter } from './values/parameter';
import { createContext } from './context-manager';
import { createBlockManager } from './block-manager';

export type Transpiler = (ast: TSESTree.Program, fileName: string) => Array<FunctionInfo>;

export const createTranspiler = (hostDefinedProperties: Array<Variable> = []): Transpiler => {
  return (program, fileName) => {
    const functionInfos: Array<FunctionInfo> = [];

    const processFunctionInfo: ScopeManager['processFunctionInfo'] = (
      name,
      body,
      parameters,
      location,
    ) => {
      const scopeManager = createScopeManager(processFunctionInfo);

      const { createScope, unshiftScope, createScopedBlock, createValueIdentifier, shiftScope } =
        scopeManager;

      // create and declare the outer scope
      // https://262.ecma-international.org/14.0/#sec-global-environment-records
      const outerScope: Scope = createScope();

      unshiftScope(outerScope);

      const outerBlock = createScopedBlock(location);

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
      const globalVariables: Array<Variable> = [
        createVariable('NaN', 'NaN', false),
        createVariable('Infinity', 'int', false),
        createVariable('undefined', 'Record', false),
        ...hostDefinedProperties,
      ];

      for (const globalVariable of globalVariables) {
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
            [
              createReference(outerScope.identifier),
              createConstant(createValueIdentifier(), name), // todo: temporary workaround until we know how to declare the shape of globals
            ],
            location,
          ),
        );
      }

      shiftScope();

      // create the first inner scope
      const rootScope = createScope();

      unshiftScope(rootScope);

      // create the function info
      const functionInfo = createFunctionInfo(
        fileName,
        createFunctionDefinition(name, generateSignature(name, fileName)),
        parameters.map(parameter => {
          let parameterName: string;

          if (parameter.type === AST_NODE_TYPES.Identifier) {
            parameterName = parameter.name;
          } else {
            // todo
            parameterName = '';
          }

          return createParameter(createValueIdentifier(), parameterName, parameter.loc);
        }),
        [outerBlock], // todo: it is possible that the outer block should not exist
      );

      // create the first block and branch the outer block to it
      const rootBlock = createScopedBlock(location);

      outerBlock.instructions.push(createBranchingInstruction(rootBlock, location));

      // create scope instruction
      const instruction = createCallInstruction(
        rootScope.identifier,
        null,
        createNewObjectFunctionDefinition(),
        [],
        location,
      );

      const context = createContext(functionInfo, createBlockManager(functionInfo), scopeManager);

      const { blockManager } = context;
      const { getCurrentBlock, pushBlock } = blockManager;

      const handleStatement = (statement: TSESTree.Statement) => {
        return _handleStatement(statement, context);
      };

      rootBlock.instructions.push(instruction);

      pushBlock(rootBlock);

      // handle the body statements
      body.forEach(handleStatement);

      const currentBlock = getCurrentBlock();

      if (!isTerminated(currentBlock)) {
        currentBlock.instructions.push(createReturnInstruction(createNull(), location));
      }

      functionInfos.push(functionInfo);

      return functionInfo;
    };

    processFunctionInfo('main', program.body, [], program.loc);

    return functionInfos;
  };
};
