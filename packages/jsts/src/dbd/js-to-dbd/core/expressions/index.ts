import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
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
import { createCallInstruction } from '../instructions/call-instruction';
import { createSetFieldFunctionDefinition } from '../function-definition';
import { ContextManager } from '../context-manager';
import { createReference } from '../values/reference';

export type CompilationResult = {
  instructions: Array<Instruction>;
  value: Value;
};

export const compileAsAssignment = (
  context: ContextManager,
  node: Exclude<TSESTree.Node, TSESTree.Statement>,
  value: Value,
  scope?: Value,
): Array<Instruction> => {
  const { scope: scopeManager } = context;
  const { createValueIdentifier, getVariableAndOwner } = scopeManager;

  const getScopeReference = (name: string) => {
    const variableAndOwner = getVariableAndOwner(name);

    if (variableAndOwner) {
      return createReference(variableAndOwner.owner.identifier);
    }

    return createNull();
  };

  switch (node.type) {
    case AST_NODE_TYPES.Identifier: {
      const { name } = node;

      return [
        createCallInstruction(
          createValueIdentifier(),
          null,
          createSetFieldFunctionDefinition(name),
          [scope || getScopeReference(name), value],
          node.loc,
        ),
      ];
    }

    case AST_NODE_TYPES.MemberExpression: {
      const { object, property } = node;

      if (property.type === AST_NODE_TYPES.Identifier) {
        const { instructions: objectInstructions, value: objectValue } = handleExpression(
          context,
          object,
          scope,
        );

        return [
          ...objectInstructions,
          createCallInstruction(
            createValueIdentifier(),
            null,
            createSetFieldFunctionDefinition(property.name),
            [objectValue, value],
            node.loc,
          ),
        ];
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

export const handleExpression: ExpressionHandler = (context, node, scope) => {
  console.info(' handleExpression', node.type);

  switch (node.type) {
    case AST_NODE_TYPES.AssignmentExpression:
      return handleAssignmentExpression(context, node, scope);
    case AST_NODE_TYPES.Literal:
      return handleLiteral(context, node, scope);
    case AST_NODE_TYPES.BinaryExpression:
      return handleBinaryExpression(context, node, scope);
    case AST_NODE_TYPES.Identifier:
      return handleIdentifier(context, node, scope);
    case AST_NODE_TYPES.MemberExpression:
      return handleMemberExpression(context, node, scope);
    case AST_NODE_TYPES.ObjectExpression:
      return handleObjectExpression(context, node, scope);
    case AST_NODE_TYPES.CallExpression:
      return handleCallExpression(context, node, scope);
    case AST_NODE_TYPES.ArrayExpression:
      return handleArrayExpression(context, node, scope);
    default:
      console.error(`Unrecognized expression: ${node.type}`);

      return {
        instructions: [],
        value: createNull(),
      };
  }
};
