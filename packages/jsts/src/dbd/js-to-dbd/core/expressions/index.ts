import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import type { Instruction } from '../instruction';
import type { Value } from '../value';
import type { ExpressionHandler } from '../expression-handler';
import { createCallInstruction } from '../instructions/call-instruction';
import { createSetFieldFunctionDefinition } from '../function-definition';
import { Context } from '../context-manager';
import { createNull } from '../values/reference';
import { handleAssignmentExpression } from './assignment-expression';
import { handleArrowFunctionExpression } from './arrow-function-expression';
import { handleLiteral } from './literal';
import { handleIdentifier } from './identifier';
import { handleBinaryExpression } from './binary-expression';
import { handleMemberExpression } from './member-expression';
import { handleObjectExpression } from './object-expression';
import { handleCallExpression } from './call-expression';
import { handleArrayExpression } from './array-expression';
import { handleVariableDeclarator } from './variable-declarator';
import { createAssignment, createVariable, type Variable } from '../variable';
import { handleUnaryExpression } from './unary-expression';

export const compileAsAssignment = (
  node: Exclude<TSESTree.Node, TSESTree.Statement>,
  value: Value,
  context: Context,
  scopeReference: Value,
): Array<Instruction> => {
  const { scopeManager } = context;
  const { getVariableAndOwner } = scopeManager;

  switch (node.type) {
    case AST_NODE_TYPES.Identifier: {
      const { name } = node;
      const { scopeManager } = context;
      const instructions: Array<Instruction> = [];

      let variable: Variable;

      const variableAndOwner = getVariableAndOwner(name, scopeReference);

      if (variableAndOwner) {
        variable = variableAndOwner.variable;

        const { createValueIdentifier, addAssignment } = scopeManager;

        const variableName = variable.name;

        // create the assignment
        const assignment = createAssignment(value.identifier, variable);

        addAssignment(variableName, assignment, scopeReference);

        instructions.push(
          createCallInstruction(
            createValueIdentifier(),
            null,
            createSetFieldFunctionDefinition(variableName),
            [scopeReference, value],
            node.loc,
          ),
        );
      }

      return instructions;
    }

    case AST_NODE_TYPES.MemberExpression: {
      const { object, property } = node;

      if (property.type === AST_NODE_TYPES.Identifier) {
        const { instructions: objectInstructions, value: objectValue } = handleExpression(
          object,
          context,
          scopeReference,
        );

        /**
         * ECMAScript allows assigning a value to a property that was not previously declared:
         *
         * ```js
         * const foo = {};
         *
         * foo.bar = ;
         * ```
         *
         * Hence, we must compile the property node as a declaration instead of an assignment.
         */
        const propertyInstructions = compileAsDeclaration(property, value, context, objectValue);

        return [...objectInstructions, ...propertyInstructions];
      } else {
        console.error(`Not supported yet...`);

        return [];
      }
    }

    default: {
      console.error(`compileAsAssignment not supported for ${node.type}`);

      return [];
    }
  }
};

export const compileAsDeclaration = (
  node: Exclude<TSESTree.Node, TSESTree.Statement>,
  value: Value,
  context: Context,
  scopeReference: Value,
): Array<Instruction> => {
  const { scopeManager } = context;

  switch (node.type) {
    case AST_NODE_TYPES.Identifier: {
      const { name } = node;
      const variable = createVariable(name);

      const scope = scopeManager.getScopeFromReference(scopeReference);

      if (scope) {
        scope.variables.set(name, variable);
      } else {
        scopeManager.addVariable(variable);
      }

      return compileAsAssignment(node, value, context, scopeReference);
    }

    default: {
      console.error(`compileAsDeclaration not supported for ${node.type}`);

      return [];
    }
  }
};

export const handleExpression: ExpressionHandler = (node, context, scopeReference) => {
  console.info(' handleExpression', node.type);

  let expressionHandler: ExpressionHandler<any>;

  switch (node.type) {
    case AST_NODE_TYPES.ArrowFunctionExpression: {
      expressionHandler = handleArrowFunctionExpression;
      break;
    }
    case AST_NODE_TYPES.AssignmentExpression: {
      expressionHandler = handleAssignmentExpression;
      break;
    }
    case AST_NODE_TYPES.Literal: {
      expressionHandler = handleLiteral;
      break;
    }
    case AST_NODE_TYPES.UnaryExpression: {
      expressionHandler = handleUnaryExpression;
      break;
    }
    case AST_NODE_TYPES.BinaryExpression: {
      expressionHandler = handleBinaryExpression;
      break;
    }
    case AST_NODE_TYPES.Identifier: {
      expressionHandler = handleIdentifier;
      break;
    }
    case AST_NODE_TYPES.MemberExpression: {
      expressionHandler = handleMemberExpression;
      break;
    }
    case AST_NODE_TYPES.ObjectExpression: {
      expressionHandler = handleObjectExpression;
      break;
    }
    case AST_NODE_TYPES.CallExpression: {
      expressionHandler = handleCallExpression;
      break;
    }
    case AST_NODE_TYPES.ArrayExpression: {
      expressionHandler = handleArrayExpression;
      break;
    }
    case AST_NODE_TYPES.VariableDeclarator: {
      expressionHandler = handleVariableDeclarator;
      break;
    }
    default:
      expressionHandler = () => {
        console.error(`Unrecognized expression: ${node.type}`);

        return {
          instructions: [],
          value: createNull(),
        };
      };
  }

  return expressionHandler(node, context, scopeReference);
};
