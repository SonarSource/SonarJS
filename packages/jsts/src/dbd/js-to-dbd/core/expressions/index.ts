import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { ContextManager } from '../context-manager';
import type { Instruction } from '../instruction';
import type { Value } from '../value';
import { handleMemberExpression } from './member-expression';
import { handleObjectExpression } from './object-expression';
import { handleIdentifier } from './identifier';
import { handleBinaryExpression } from './binary-expression';
import { handleLiteral } from './literal';
import { handleAssignmentExpression } from './assignment-expression';
import { handleCallExpression } from './call-expression';

export type CompilationResult = {
  instructions: Array<Instruction>;
  value: Value;
};

export function handleExpression(
  context: ContextManager,
  node: TSESTree.Expression,
): CompilationResult {
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
    default:
      throw new Error(`Unrecognized expression: ${node.type}`);
  }
}
