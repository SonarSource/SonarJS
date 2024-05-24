import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { type Scope } from './scope';
import { createAssignment, createVariable, type Variable } from './variable';
import { type Block } from './block';
import type { Location } from './location';
import {
  createFunctionDefinition,
  createFunctionDefinition2,
  createNewObjectFunctionDefinition,
  createSetFieldFunctionDefinition,
} from './function-definition';
import { type CallInstruction, createCallInstruction } from './instructions/call-instruction';
import { createConstant } from './values/constant';
import { createBranchingInstruction } from './instructions/branching-instruction';
import { createReference } from './values/reference';
import { createReturnInstruction } from './instructions/return-instruction';
import { createConditionalBranchingInstruction } from './instructions/conditional-branching-instruction';
import { isATerminatorInstruction } from './instructions/terminator-instruction';
import type { Instruction } from './instruction';
import type { Value } from './value';
import { createNull } from './values/null';
import { createFunctionInfo as _createFunctionInfo, type FunctionInfo } from './function-info';
import { ContextManager } from './context-manager';
import { handleExpression } from './expressions';
import { getLocation } from '../../frontend/utils';

export type Transpiler = (ast: TSESTree.Program, fileName: string) => Array<FunctionInfo>;

export const createTranspiler = (hostDefinedProperties: Array<Variable> = []): Transpiler => {
  return (program, fileName) => {
    const functionInfos: Array<FunctionInfo> = [];

    const createFunctionInfo = (name: string, signature: string): FunctionInfo => {
      return _createFunctionInfo(fileName, createFunctionDefinition2(name, signature));
    };

    const processFunctionInfo = (functionInfo: FunctionInfo, node: TSESTree.Program) => {
      functionInfos.push(functionInfo);
      const context = new ContextManager(functionInfo);

      const getCurrentBlock = () => {
        console.log(functionInfos);

        return context.block.getCurrentBlock();
      };

      const isTerminated = (block: Block): boolean => {
        const lastInstruction = getBlockLastInstruction(block);

        return lastInstruction !== null && isATerminatorInstruction(lastInstruction);
      };

      const createScopeDeclarationInstruction = (
        scope: Scope,
        location: Location,
      ): CallInstruction => {
        return createCallInstruction(
          scope.identifier,
          null,
          createNewObjectFunctionDefinition(),
          [],
          location,
        );
      };

      const getBlockLastInstruction = (block: Block): Instruction | null => {
        const { instructions } = block;

        return instructions.length > 0 ? instructions[instructions.length - 1] : null;
      };

      const visitStatement = (node: TSESTree.Statement): void => {
        console.log('visit', node.type);

        switch (node.type) {
          case AST_NODE_TYPES.BlockStatement: {
            const blockScope = context.scope.createScope();
            context.scope.push(blockScope);

            const bbn = context.block.createScopedBlock(node.loc);

            // branch current block to bbn
            getCurrentBlock().instructions.push(createBranchingInstruction(bbn, node.loc));

            // promote bbn as current block
            context.block.push(bbn);

            // create scope instruction
            const instruction = createCallInstruction(
              blockScope.identifier,
              null,
              createNewObjectFunctionDefinition(),
              [],
              node.loc,
            );

            getCurrentBlock().instructions.push(instruction);
            node.body.forEach(visitStatement);

            context.scope.pop();

            const bbnPlusOne = context.block.createScopedBlock(node.loc);

            // branch the current block to bbnPlusOne
            getCurrentBlock().instructions.push(createBranchingInstruction(bbnPlusOne, node.loc));

            // promote bbnPlusOne as current block
            context.block.push(bbnPlusOne);

            break;
          }

          case AST_NODE_TYPES.ExpressionStatement: {
            const { instructions } = handleExpression(context, node.expression);
            getCurrentBlock().instructions.push(...instructions);
            break;
          }

          case AST_NODE_TYPES.FunctionDeclaration: {
            // const { id } = node;
            //
            // const functionInfo = createFunctionInfo(id!.name, '');
            //
            // processFunctionInfo(functionInfo, node.body);

            break;
          }

          case AST_NODE_TYPES.IfStatement: {
            const { consequent, alternate, test } = node;
            const currentBlock = getCurrentBlock();

            // the "finally" block belongs to the same scope as the current block
            const finallyBlock = context.block.createScopedBlock(node.loc);

            const processNode = (innerNode: TSESTree.Statement | null): Block => {
              const currentScope = context.scope.push(context.scope.createScope());

              const loc = innerNode === null ? node.loc : innerNode.loc;
              let block;
              if (!innerNode) {
                block = context.block.createScopedBlock(loc);
                context.block.push(block);
              } else {
                block = context.block.createScopedBlock(loc);

                block.instructions.push(
                  createScopeDeclarationInstruction(currentScope, innerNode.loc),
                );

                context.block.push(block);
                visitStatement(innerNode);
              }
              context.scope.pop();
              if (!isTerminated(getCurrentBlock())) {
                // branch the CURRENT BLOCK to the finally one
                getCurrentBlock().instructions.push(createBranchingInstruction(finallyBlock, loc));
              }
              return block;
            };

            const { instructions: testInstructions, value: testValue } = handleExpression(
              context,
              test,
            );

            currentBlock.instructions.push(...testInstructions);

            // process the consequent block
            const consequentBlock = processNode(consequent);

            // process the alternate block
            const alternateBlock = processNode(alternate);

            // add the conditional branching instruction
            currentBlock.instructions.push(
              createConditionalBranchingInstruction(
                testValue,
                consequentBlock,
                alternateBlock,
                node.loc,
              ),
            );

            context.block.push(finallyBlock);

            break;
          }

          case AST_NODE_TYPES.VariableDeclaration: {
            if (node.declarations.length !== 1) {
              throw new Error(
                `Unable to handle declaration with ${node.declarations.length} declarations (${JSON.stringify(getLocation(node))})`,
              );
            }
            const declarator = node.declarations[0];
            if (!declarator || declarator.type !== TSESTree.AST_NODE_TYPES.VariableDeclarator) {
              throw new Error('Unhandled declaration');
            }
            if (declarator.id.type !== TSESTree.AST_NODE_TYPES.Identifier) {
              throw new Error(`Unhandled declaration id type ${declarator.id.type}`);
            }
            const variableName = declarator.id.name;
            const currentBlock = getCurrentBlock();

            let value: Value;

            if (declarator.init) {
              const result = handleExpression(context, declarator.init);

              value = result.value;

              currentBlock.instructions.push(...result.instructions);
            } else {
              value = createNull();
            }

            const currentScope = currentBlock.scope;
            const referenceIdentifier = context.scope.createValueIdentifier();

            // add the variable to the scope
            const variable = createVariable(variableName);

            currentScope.variables.set(variableName, variable);

            // create the assignment
            currentScope.assignments.set(
              variableName,
              createAssignment(referenceIdentifier, variable),
            );

            // todo: createScopeAssignmentInstruction...
            const instruction = createCallInstruction(
              referenceIdentifier,
              null,
              createSetFieldFunctionDefinition(variableName),
              [createReference(currentScope.identifier), value],
              node.loc,
            );

            currentBlock.instructions.push(instruction);

            break;
          }

          default: {
            throw new Error(`Unhandled statement ${node.type}`);
          }
        }
      };

      const location = node.loc;

      // create and declare the outer scope
      // https://262.ecma-international.org/14.0/#sec-global-environment-records
      const outerScope: Scope = context.scope.push(context.scope.createScope());

      const outerBlock = context.block.createScopedBlock(location);

      context.block.push(outerBlock);

      outerBlock.instructions.push(createScopeDeclarationInstruction(outerScope, location));

      // globalThis, a reference to the outer scope itself
      outerBlock.instructions.push(
        createCallInstruction(
          context.scope.createValueIdentifier(),
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
        const assignmentIdentifier = context.scope.createValueIdentifier();

        const assignment = createAssignment(assignmentIdentifier, globalVariable);

        outerScope.variables.set(name, globalVariable);
        outerScope.assignments.set(name, assignment);

        outerBlock.instructions.push(
          createCallInstruction(
            assignment.identifier,
            null,
            createSetFieldFunctionDefinition(name),
            [
              createReference(outerScope.identifier),
              createConstant(context.scope.createValueIdentifier(), name), // todo: temporary workaround until we know how to declare the shape of globals
            ],
            location,
          ),
        );
      }

      context.scope.push(outerScope);

      // create the first inner scope
      const rootScope = context.scope.createScope();

      context.scope.push(rootScope);

      // create the first block and branch the outer block to it
      const rootBlock = context.block.createScopedBlock(location);

      outerBlock.instructions.push(createBranchingInstruction(rootBlock, location));

      context.block.push(rootBlock);

      // create scope instruction
      const instruction = createCallInstruction(
        rootScope.identifier,
        null,
        createFunctionDefinition(`new-object`),
        [],
        location,
      );

      rootBlock.instructions.push(instruction);

      node.body.forEach(visitStatement);
      const currentBlock = getCurrentBlock();

      if (!isTerminated(currentBlock)) {
        currentBlock.instructions.push(createReturnInstruction(createNull(), location));
      }
    };

    // process the program
    const mainFunctionInfo = createFunctionInfo('__main__', '#__main__');

    processFunctionInfo(mainFunctionInfo, program);

    return functionInfos;
  };
};
