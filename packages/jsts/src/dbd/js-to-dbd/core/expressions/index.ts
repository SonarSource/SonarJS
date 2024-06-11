import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import type { Value } from '../value';
import { type ExpressionHandler } from '../expression-handler';
import { createCallInstruction } from '../instructions/call-instruction';
import { createSetFieldFunctionDefinition } from '../function-definition';
import { handleAssignmentExpression } from './assignment-expression';
import { handleArrowFunctionExpression } from './arrow-function-expression';
import { handleLiteral } from './literal';
import { handleIdentifier } from './identifier';
import { handleBinaryExpression } from './binary-expression';
import { handleMemberExpression } from './member-expression';
import { handleObjectExpression } from './object-expression';
import { handleCallExpression } from './call-expression';
import { handleArrayExpression } from './array-expression';
import { handleUnaryExpression } from './unary-expression';
import { handleLogicalExpression } from './logical-expression';
import { handleConditionalExpression } from './conditional-expression';
import { createNull } from '../values/constant';
import { FunctionInfo } from '../function-info';
import { unresolvable } from '../scope-manager';
import { createReference } from '../values/reference';

export const compileAsAssignment = (
  node: Exclude<TSESTree.Node, TSESTree.Statement>,
  functionInfo: FunctionInfo,
  value: Value,
) => {
  switch (node.type) {
    case AST_NODE_TYPES.Identifier: {
      const identifierReference = functionInfo.scopeManager.getIdentifierReference(node);

      if (identifierReference.base === unresolvable) {
        console.error(`Unresolvable identifier: ${node.name}`);
      } else {
        const scopeId = functionInfo.scopeManager.getScopeId(identifierReference.variable.scope);
        functionInfo.addInstructions([
          createCallInstruction(
            functionInfo.scopeManager.createValueIdentifier(),
            null,
            createSetFieldFunctionDefinition(node.name),
            [createReference(scopeId), value],
            node.loc,
          ),
        ]);
      }
      return;
    }

    case AST_NODE_TYPES.MemberExpression: {
      const { object, property } = node;

      if (property.type === AST_NODE_TYPES.Identifier) {
        const objectValue = handleExpression(object, functionInfo);
        functionInfo.addInstructions([
          createCallInstruction(
            functionInfo.scopeManager.createValueIdentifier(),
            null,
            createSetFieldFunctionDefinition(property.name),
            [objectValue, value],
            node.loc,
          ),
        ]);
      } else {
        console.error(`Unsupported assignment in member expression ${property.type}`);
      }
      return;
    }

    default: {
      console.error(`compileAsAssignment not supported for ${node.type}`);

      return;
    }
  }
};

export const handleExpression: ExpressionHandler = (node, functionInfo) => {
  console.info(' handleExpression', node.type);

  let expressionHandler: ExpressionHandler<any>;

  switch (node.type) {
    case AST_NODE_TYPES.ArrayExpression: {
      expressionHandler = handleArrayExpression;
      break;
    }
    case AST_NODE_TYPES.ArrowFunctionExpression: {
      expressionHandler = handleArrowFunctionExpression;
      break;
    }
    case AST_NODE_TYPES.AssignmentExpression: {
      expressionHandler = handleAssignmentExpression;
      break;
    }
    case AST_NODE_TYPES.BinaryExpression: {
      expressionHandler = handleBinaryExpression;
      break;
    }
    case AST_NODE_TYPES.CallExpression: {
      expressionHandler = handleCallExpression;
      break;
    }
    case AST_NODE_TYPES.ConditionalExpression: {
      expressionHandler = handleConditionalExpression;
      break;
    }
    case AST_NODE_TYPES.Identifier: {
      expressionHandler = handleIdentifier;
      break;
    }
    case AST_NODE_TYPES.Literal: {
      expressionHandler = handleLiteral;
      break;
    }
    case AST_NODE_TYPES.LogicalExpression: {
      expressionHandler = handleLogicalExpression;
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
    case AST_NODE_TYPES.UnaryExpression: {
      expressionHandler = handleUnaryExpression;
      break;
    }
    default:
      expressionHandler = () => {
        console.error(`Unrecognized expression: ${node.type}`);

        return createNull();
      };
  }

  return expressionHandler(node, functionInfo);
};
