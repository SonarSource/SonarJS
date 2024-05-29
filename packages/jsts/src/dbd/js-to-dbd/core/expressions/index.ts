import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import type { Instruction } from '../instruction';
import type { Value } from '../value';
import { createNull } from '../values/null';
import type { ExpressionHandler } from '../expression-handler';
import { createCallInstruction } from '../instructions/call-instruction';
import { createSetFieldFunctionDefinition } from '../function-definition';
import { Context } from '../context-manager';
import { createReference } from '../values/reference';
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
import type { ScopeManager } from '../scope-manager';
import type { Location } from '../location';

export type CompilationResult = {
  instructions: Array<Instruction>;
  value: Value;
};

const processAssignment = (
  variable: Variable,
  value: Value,
  location: Location,
  scopeManager: ScopeManager,
  scope?: Value,
): CompilationResult => {
  const { getCurrentScopeIdentifier, createValueIdentifier, addAssignment } = scopeManager;

  const variableName = variable.name;
  const instructions: Array<Instruction> = [];

  // create the assignment
  if (scope && scopeManager.getScopeFromRegistry(scope)) {
    scopeManager
      .getScopeFromRegistry(scope)!
      .assignments.set(variable.name, createAssignment(value.identifier, variable));
  } else {
    addAssignment(variableName, createAssignment(value.identifier, variable));
  }

  instructions.push(
    createCallInstruction(
      createValueIdentifier(),
      null,
      createSetFieldFunctionDefinition(variableName),
      [createReference(getCurrentScopeIdentifier()), value],
      location,
    ),
  );

  return {
    instructions,
    value,
  };
};

export const compileAsAssignment = (
  node: Exclude<TSESTree.Node, TSESTree.Statement>,
  value: Value,
  context: Context,
  scope?: Value,
): Array<Instruction> => {
  const { scopeManager } = context;
  const { createValueIdentifier, getVariableAndOwner } = scopeManager;

  switch (node.type) {
    case AST_NODE_TYPES.Identifier: {
      const { name } = node;
      const { scopeManager } = context;

      let variable: Variable;

      const variableAndOwner = getVariableAndOwner(name, scope);

      if (!variableAndOwner) {
        variable = createVariable(name);

        scopeManager.addVariable(variable);
      } else {
        variable = variableAndOwner.variable;
      }

      return processAssignment(variable, value, node.loc, scopeManager, scope).instructions;
    }

    case AST_NODE_TYPES.MemberExpression: {
      const { object, property } = node;

      if (property.type === AST_NODE_TYPES.Identifier) {
        const { instructions: objectInstructions, value: objectValue } = handleExpression(
          object,
          context,
        );
        const assignmentInstructions = compileAsAssignment(property, value, context, objectValue);

        return [
          ...objectInstructions,
          ...assignmentInstructions,
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

export const compileAsDeclaration = (
  node: Exclude<TSESTree.Node, TSESTree.Statement>,
  value: Value,
  context: Context,
  scope?: Value, // todo: mandatory at some point
): Array<Instruction> => {
  const { scopeManager } = context;

  switch (node.type) {
    case AST_NODE_TYPES.Identifier: {
      const { name } = node;
      const variable = createVariable(name);

      scopeManager.addVariable(variable);
      if (scope && scopeManager.getScopeFromRegistry(scope)) {
        scopeManager.getScopeFromRegistry(scope)!.variables.set(name, variable);
      }

      return processAssignment(variable, value, node.loc, scopeManager, scope).instructions;
    }

    default: {
      console.error(`compileAsDeclaration not supported for ${node.type}`);

      return [];
    }
  }
};

export const handleExpression: ExpressionHandler = (node, context, scope) => {
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

  return expressionHandler(node, context, scope);
};
