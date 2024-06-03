import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import type { Instruction } from '../instruction';
import type { BaseValue, Value } from '../value';
import { type ExpressionHandler } from '../expression-handler';
import { createCallInstruction } from '../instructions/call-instruction';
import { createSetFieldFunctionDefinition } from '../function-definition';
import { Context } from '../context';
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
import { handleUnaryExpression } from './unary-expression';
import { handleLogicalExpression } from './logical-expression';
import { handleConditionalExpression } from './conditional-expression';
import { type Record, putValue, unresolvable } from '../ecma/reference-record';
import { createReference } from '../values/reference';
import { type Constant, createNull } from '../values/constant';
import { getIdentifierReference, isAnEnvironmentRecord } from '../ecma/environment-record';

export const compileAsAssignment = (
  node: Exclude<TSESTree.Node, TSESTree.Statement>,
  record: Record,
  context: Context,
  value: Value,
): Array<Instruction> => {
  switch (node.type) {
    case AST_NODE_TYPES.Identifier: {
      const instructions: Array<Instruction> = [];

      if (record === unresolvable) {
        throw new Error('CHECK WHY IT HAPPENS');
      }

      if (isAnEnvironmentRecord(record)) {
        const referenceRecord = getIdentifierReference(record, node.name);

        putValue(referenceRecord, value);
      } else {
        record.bindings.set(node.name, value);
      }

      instructions.push(
        createCallInstruction(
          context.scopeManager.createValueIdentifier(),
          null,
          createSetFieldFunctionDefinition(node.name),
          [createReference(record.identifier), value],
          node.loc,
        ),
      );

      return instructions;
    }

    case AST_NODE_TYPES.MemberExpression: {
      const { object, property } = node;

      if (property.type === AST_NODE_TYPES.Identifier) {
        const objectValue = handleExpression(object, record, context);

        const propertyInstructions = compileAsAssignment(property, objectValue, context, value);

        return [...propertyInstructions];
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
  record: Record,
  context: Context,
  value: BaseValue<any>,
): Array<Instruction> => {
  switch (node.type) {
    case AST_NODE_TYPES.Identifier: {
      const { name } = node;

      if (record === unresolvable) {
        throw new Error('TODO: TRACK WHY IT IS HAPPENING');
      }

      if (isAnEnvironmentRecord(record)) {
        putValue(
          {
            base: record,
            referencedName: name,
            strict: true,
          },
          value,
        );
      } else {
        record.bindings.set(name, value);
      }

      return [
        createCallInstruction(
          context.scopeManager.createValueIdentifier(),
          null,
          createSetFieldFunctionDefinition(name),
          [createReference(record.identifier), value as Constant],
          node.loc,
        ),
      ];
    }

    default: {
      console.error(`compileAsDeclaration not supported for ${node.type}`);

      return [];
    }
  }
};

export const handleExpression: ExpressionHandler = (node, record, context) => {
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
    case AST_NODE_TYPES.VariableDeclarator: {
      expressionHandler = handleVariableDeclarator;
      break;
    }
    default:
      expressionHandler = () => {
        console.error(`Unrecognized expression: ${node.type}`);

        return createNull();
      };
  }

  return expressionHandler(node, record, context);
};
