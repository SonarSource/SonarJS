import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import type { Instruction } from '../instruction';
import type { Value } from '../value';
import { handleMemberExpression } from './member-expression';
import { handleObjectExpression } from './object-expression';
import { handleIdentifier } from './identifier';
import { handleBinaryExpression } from './binary-expression';
import { handleLiteral } from './literal';
import { handleAssignmentExpression } from './assignment-expression';
import { handleCallExpression } from './call-expression';
import { createNull } from '../values/null';
import { handleArrayExpression } from './array-expression';
import type { ExpressionHandler } from '../expression-handler';

export type CompilationResult = {
  instructions: Array<Instruction>;
  value: Value;
};

export const handleExpression: ExpressionHandler = (context, node) => {
  switch (node.type) {
    case AST_NODE_TYPES.AssignmentExpression:
      return handleAssignmentExpression(context, node);
    case AST_NODE_TYPES.Literal:
      return handleLiteral(context, node);
    case AST_NODE_TYPES.BinaryExpression:
      return handleBinaryExpression(context, node);
    case AST_NODE_TYPES.Identifier:
      return handleIdentifier(context, node);
    case AST_NODE_TYPES.MemberExpression:
      return handleMemberExpression(context, node);
    case AST_NODE_TYPES.ObjectExpression:
      return handleObjectExpression(context, node);
    case AST_NODE_TYPES.CallExpression:
      return handleCallExpression(context, node);
    case AST_NODE_TYPES.ArrayExpression:
      return handleArrayExpression(context, node);
    default:
      console.error(`Unrecognized expression: ${node.type}`);

      return {
        instructions: [],
        value: createNull(),
      };
  }
};
