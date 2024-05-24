import {AST_NODE_TYPES, TSESTree} from "@typescript-eslint/typescript-estree";
import {desugar, type DesugaredBlockStatement, DesugaredNode, DesugaredStatement} from "./desugarer";
import {createScope as _createScope, type Scope} from "./scope";
import {type Assignment, createAssignment, createVariable, type Variable} from "./variable";
import {type Block} from "./block";
import type {Location} from "./location";
import {
  createFunctionDefinition, createFunctionDefinition2,
  createNewObjectFunctionDefinition,
  createSetFieldFunctionDefinition
} from "./function-definition";
import {type CallInstruction, createCallInstruction} from "./instructions/call-instruction";
import {createConstant} from "./values/constant";
import {createBranchingInstruction} from "./instructions/branching-instruction";
import {createReference} from "./values/reference";
import {createReturnInstruction} from "./instructions/return-instruction";
import {createConditionalBranchingInstruction} from "./instructions/conditional-branching-instruction";
import {isATerminatorInstruction} from "./instructions/terminator-instruction";
import type {Instruction} from "./instruction";
import {createCompiler} from "./compiler";
import type {Value} from "./value";
import {createNull} from "./values/null";
import {createFunctionInfo as _createFunctionInfo, type FunctionInfo} from "./function-info";
import {ContextManager} from "./context-manager";

export type Transpiler = (ast: TSESTree.Program, fileName: string) => Array<FunctionInfo>;

export const createTranspiler = (
  hostDefinedProperties: Array<Variable> = []
): Transpiler => {
  return (program, fileName) => {
    const functionInfos: Array<FunctionInfo> = [];

    const createFunctionInfo = (
      name: string,
      signature: string
    ): FunctionInfo => {
      return _createFunctionInfo(
        fileName,
        createFunctionDefinition2(
          name,
          signature
        ),
      );
    };

    const processFunctionInfo = (
      functionInfo: FunctionInfo,
      node: DesugaredNode
    ) => {
      functionInfos.push(functionInfo);
      const context = new ContextManager(functionInfo);

      const getCurrentBlock = () => {
        console.log(functionInfos);

        return context.block.getCurrentBlock();
      }

      const isTerminated = (block: Block): boolean => {
        const lastInstruction = getBlockLastInstruction(block);

        return (lastInstruction !== null) && isATerminatorInstruction(lastInstruction);
      };

      const createScopeDeclarationInstruction = (
        scope: Scope,
        location: Location
      ): CallInstruction => {
        return createCallInstruction(
          scope.identifier,
          null,
          createNewObjectFunctionDefinition(),
          [],
          location
        );
      };

      const getBlockLastInstruction = (block: Block): Instruction | null => {
        const {instructions} = block;

        return instructions.length > 0 ? instructions[instructions.length - 1] : null;
      };

      const compile = createCompiler(context.scope);

      const visit = (node: DesugaredNode): void => {
        console.log('visit', node.type);

        switch (node.type) {
          case AST_NODE_TYPES.AssignmentExpression: {
            let variableName: string;

            const {left, right} = node;

            if (left.type === AST_NODE_TYPES.Identifier) {
              variableName = left.name;
            } else {
              // todo
              variableName = left.type;
            }

            const {instructions: rightInstructions, value: rightValue} = compile(right);

            getCurrentBlock().instructions.push(...rightInstructions);

            // An assignment to an identifier is an assignment to a property of the current scope
            const variableAndOwner = context.scope.getVariableAndOwner(variableName);
            const currentBlock = getCurrentBlock();

            if (variableAndOwner) {
              const {variable, owner} = variableAndOwner;

              const assignment = createAssignment(
                context.scope.createValueIdentifier(),
                variable
              );

              currentBlock.scope.assignments.set(variableName, assignment);

              const instruction = createCallInstruction(
                assignment.identifier,
                null,
                createSetFieldFunctionDefinition(variable.name),
                [
                  createReference(owner.identifier),
                  rightValue
                ],
                node.loc
              );

              currentBlock.instructions.push(instruction);
            } else {
              // todo: what do we do if there is no variable to assign to?
            }

            break;
          }

          case AST_NODE_TYPES.BinaryExpression: {
            const {instructions} = compile(node);

            getCurrentBlock().instructions.push(...instructions);

            break;
          }

          case AST_NODE_TYPES.BlockStatement: {
            const blockScope = context.scope.createScope();
            context.scope.push(blockScope);

            const bbn = context.block.createScopedBlock(node.loc);

            // branch current block to bbn
            getCurrentBlock().instructions.push(createBranchingInstruction(
              bbn,
              node.loc
            ));

            // promote bbn as current block
            context.block.push(bbn);

            // create scope instruction
            const instruction = createCallInstruction(
              blockScope.identifier,
              null,
              createNewObjectFunctionDefinition(),
              [],
              node.loc
            );

            getCurrentBlock().instructions.push(instruction);

            node.body.forEach(visit);

            context.scope.pop();

            const bbnPlusOne = context.block.createScopedBlock(node.loc);

            // branch the current block to bbnPlusOne
            getCurrentBlock().instructions.push(createBranchingInstruction(
              bbnPlusOne,
              node.loc
            ));

            // promote bbnPlusOne as current block
            context.block.push(bbnPlusOne);

            break;
          }

          case AST_NODE_TYPES.CallExpression: {
            const {callee} = node;

            const {instructions} = compile(callee);
            const calleeName = (callee as TSESTree.Identifier).name;

            getCurrentBlock().instructions.push(
              ...instructions,
              createCallInstruction(
                context.scope.createValueIdentifier(),
                null,
                createFunctionDefinition2(
                  calleeName,
                  `${fileName}.${calleeName}`
                ),
                [],
                node.loc
              )
            );

            break;
          }

          case AST_NODE_TYPES.ExpressionStatement: {
            visit(node.expression);

            break;
          }

          case AST_NODE_TYPES.FunctionDeclaration: {
            const {id} = node;

            const functionInfo = createFunctionInfo(
              id!.name,
              ''
            );

            processFunctionInfo(functionInfo, node.body as DesugaredBlockStatement);

            break;
          }

          case AST_NODE_TYPES.IfStatement: {
            const {consequent, alternate, test} = node;
            const currentBlock = getCurrentBlock();

            // the "finally" block belongs to the same scope as the current block
            const finallyBlock = context.block.createScopedBlock(node.loc);

            const processNode = (
              node: DesugaredStatement
            ): Block => {
              const currentScope = context.scope.push(context.scope.createScope());

              const block = context.block.createScopedBlock(node.loc);

              block.instructions.push(createScopeDeclarationInstruction(
                currentScope,
                node.loc
              ));

              context.block.push(block);

              if (node.type === AST_NODE_TYPES.BlockStatement) {
                node.body.forEach(visit);
              } else {
                visit(node);
              }

              context.scope.pop();

              if (!isTerminated(getCurrentBlock())) {
                // branch the CURRENT BLOCK to the finally one
                getCurrentBlock().instructions.push(createBranchingInstruction(
                  finallyBlock,
                  node.loc
                ));
              }

              return block;
            }

            const {instructions: testInstructions, value: testValue} = compile(test);

            currentBlock.instructions.push(...testInstructions);

            // process the consequent block
            const consequentBlock = processNode(consequent);

            // process the alternate block
            const alternateBlock = processNode(alternate);

            // add the conditional branching instruction
            currentBlock.instructions.push(createConditionalBranchingInstruction(
              testValue,
              consequentBlock,
              alternateBlock,
              node.loc
            ));

            context.block.push(finallyBlock);

            break;
          }

          case AST_NODE_TYPES.MemberExpression: {
            const {instructions} = compile(node);

            getCurrentBlock().instructions.push(...instructions);

            break;
          }

          case AST_NODE_TYPES.Program: {
            node.body.forEach(visit);

            break;
          }

          case AST_NODE_TYPES.VariableDeclaration: {
            node.declarations.forEach(visit);

            break;
          }

          case AST_NODE_TYPES.VariableDeclarator: {
            let variableName: string;

            if (node.id.type === AST_NODE_TYPES.Identifier) {
              variableName = node.id.name;
            } else {
              // todo: BindingName
              variableName = node.id.type;
            }

            const currentBlock = getCurrentBlock();

            let value: Value;

            if (node.init) {
              const result = compile(node.init);

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
            currentScope.assignments.set(variableName, createAssignment(
              referenceIdentifier,
              variable
            ));

            // todo: createScopeAssignmentInstruction...
            const instruction = createCallInstruction(
              referenceIdentifier,
              null,
              createSetFieldFunctionDefinition(variableName),
              [
                createReference(currentScope.identifier),
                value
              ],
              node.loc
            );

            currentBlock.instructions.push(instruction);

            break;
          }

          default: {
            // getCurrentBlock().instructions.push(`instruction for ${node.type}`);
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
      outerBlock.instructions.push(createCallInstruction(
        context.scope.createValueIdentifier(),
        null,
        createSetFieldFunctionDefinition('globalThis'),
        [
          createReference(outerScope.identifier),
          createReference(outerScope.identifier)
        ],
        location
      ));

      // assign global variables to the outer scope and declare them
      const globalVariables: Array<Variable> = [
        createVariable('NaN', 'NaN', false),
        createVariable('Infinity', 'int', false),
        createVariable('undefined', 'Record', false),
        ...hostDefinedProperties
      ];

      for (const globalVariable of globalVariables) {
        const {name} = globalVariable;
        const assignmentIdentifier = context.scope.createValueIdentifier();

        let assignment: Assignment;

        assignment = createAssignment(
          assignmentIdentifier,
          globalVariable
        );

        outerScope.variables.set(name, globalVariable);
        outerScope.assignments.set(name, assignment);

        outerBlock.instructions.push(createCallInstruction(
          assignment.identifier,
          null,
          createSetFieldFunctionDefinition(name),
          [
            createReference(outerScope.identifier),
            createConstant(context.scope.createValueIdentifier(), name) // todo: temporary workaround until we know how to declare the shape of globals
          ],
          location
        ));
      }

      context.scope.push(outerScope);

      // create the first inner scope
      const rootScope = context.scope.createScope();

      context.scope.push(rootScope);

      // create the first block and branch the outer block to it
      const rootBlock = context.block.createScopedBlock(location);

      outerBlock.instructions.push(createBranchingInstruction(
        rootBlock,
        location
      ));

      context.block.push(rootBlock);

      // create scope instruction
      const instruction = createCallInstruction(
        rootScope.identifier,
        null,
        createFunctionDefinition(`new-object`),
        [],
        location
      );

      rootBlock.instructions.push(instruction);

      visit(node);

      if (true) {
        const currentBlock = getCurrentBlock();

        if (!isTerminated(currentBlock)) {
          currentBlock.instructions.push(createReturnInstruction(
            createNull(),
            location
          ));
        }
      }
    }

    // process the program
    const mainFunctionInfo = createFunctionInfo('__main__', '#__main__');

    processFunctionInfo(mainFunctionInfo, desugar(program));

    return functionInfos;
  };
};
