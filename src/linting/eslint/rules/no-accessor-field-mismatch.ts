/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://sonarsource.github.io/rspec/#/rspec/S4275/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { toEncodedMessage } from './helpers';
import { SONAR_RUNTIME } from 'linting/eslint/linter/parameters';
import { eslintRules } from 'linting/eslint/rules/core';
import { interceptReport, mergeRules } from './decorators/helpers';

type AccessorNode = TSESTree.Property | TSESTree.MethodDefinition;

function isAccessorNode(node: TSESTree.Node): node is AccessorNode {
  return node.type === 'Property' || node.type === 'MethodDefinition';
}

// The 'definition' property says how the accessor is defined: that's to say if it's part of a class definition,
// an object literal or a property descriptor passed to one of the Object.defineProperty() variants.
// The 'refResolver' property is used to extract the reference name used by the accessor.
interface AccessorInfo {
  type: 'getter' | 'setter';
  name: string;
}

interface Accessor {
  info: AccessorInfo;
  statement: TSESTree.Statement | null;
  matchingFields: Field[];
  node: AccessorNode;
}

interface Field {
  name: string;
  node: TSESTree.Node;
}

// The rule is the merger of a decorated ESLint 'getter-return' with the SonarJS 'no-accessor-field-mismatch'.
export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const getterReturnListener = getterReturnDecorator.create(context);
    const noAccessorFieldMismatchListener = noAccessorFieldMismatchRule.create(context);
    return mergeRules(getterReturnListener, noAccessorFieldMismatchListener);
  },
};

// The decorator adds secondary location to ESLint 'getter-return'
// as found in issues raised by SonarJS 'no-accessor-field-mismatch'.
function decorateGetterReturn(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, (context, descriptor) => {
    const props: { messageId?: string; node?: estree.Node } & Rule.ReportDescriptor = descriptor;
    const { node, messageId } = props;

    // The ESLint reports on functions, so the accessor might be the parent.
    // And if it's an accessor with a matching field, report with secondary location pointing to the field.
    if (node != null && reportWithFieldLocation(context, (node as TSESTree.Node).parent)) {
      return;
    }

    // Otherwise convert the message to the Sonar format.
    if (messageId === 'expected') {
      reportWithSonarFormat(context, descriptor, 'Refactor this getter to return a value.');
    } else if (messageId === 'expectedAlways') {
      reportWithSonarFormat(context, descriptor, 'Refactor this getter to always return a value.');
    }
  });
}

const getterReturnDecorator = decorateGetterReturn(eslintRules['getter-return']);

const noAccessorFieldMismatchRule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    // Stack of nested object or class fields
    const currentFieldsStack = [new Map<string, Field>()];

    function checkAccessor(node: TSESTree.Property | TSESTree.MethodDefinition) {
      const fieldMap = currentFieldsStack[currentFieldsStack.length - 1];
      const accessor = getAccessor(node, fieldMap);
      if (accessor == null || isReportedByGetterReturnDecorator(accessor)) {
        return;
      }

      if (
        accessor.statement == null ||
        !isUsingAccessorFieldInBody(accessor.statement, accessor.info, accessor.matchingFields)
      ) {
        reportWithSecondaryLocation(context, accessor);
      }
    }

    return {
      Property: (node: estree.Node) => checkAccessor(node as TSESTree.Property),
      MethodDefinition: (node: estree.Node) => checkAccessor(node as TSESTree.MethodDefinition),

      ClassBody: (node: estree.Node) => {
        currentFieldsStack.push(getClassBodyFieldMap(node as TSESTree.ClassBody));
      },
      ObjectExpression: (node: estree.Node) => {
        currentFieldsStack.push(getObjectExpressionFieldMap(node as TSESTree.ObjectExpression));
      },
      ':matches(ClassBody, ObjectExpression):exit': () => {
        currentFieldsStack.pop();
      },
    };
  },
};

function isReportedByGetterReturnDecorator(accessor: Accessor) {
  return accessor.info.type === 'getter' && accessor.statement == null;
}

function reportWithFieldLocation(context: Rule.RuleContext, node: TSESTree.Node | undefined) {
  if (!node || !isAccessorNode(node)) {
    return false;
  }
  const accessor = getDeclaringAccessor(node);
  if (!accessor) {
    return false;
  }
  reportWithSecondaryLocation(context, accessor);
  return true;
}

function reportWithSonarFormat(
  context: Rule.RuleContext,
  descriptor: Rule.ReportDescriptor,
  message: string,
) {
  context.report({ ...descriptor, messageId: undefined, message: toEncodedMessage(message) });
}

function reportWithSecondaryLocation(context: Rule.RuleContext, accessor: Accessor) {
  const fieldToRefer = accessor.matchingFields[0];
  const primaryMessage =
    `Refactor this ${accessor.info.type} ` +
    `so that it actually refers to the property '${fieldToRefer.name}'.`;
  const secondaryLocations = [fieldToRefer.node];
  const secondaryMessages = ['Property which should be referred.'];

  context.report({
    message: toEncodedMessage(primaryMessage, secondaryLocations, secondaryMessages),
    loc: accessor.node.key.loc,
  });
}

function getDeclaringAccessor(node: TSESTree.Node | undefined) {
  if (node == null || !isAccessorNode(node)) {
    return null;
  }
  return getAccessor(node, getDeclaringAccessorFieldMap(node));
}

function getAccessor(
  accessor: TSESTree.Property | TSESTree.MethodDefinition,
  fieldMap: Map<string, Field> | null,
) {
  const accessorIsPublic =
    accessor.type !== 'MethodDefinition' ||
    accessor.accessibility == null ||
    accessor.accessibility === 'public';
  const accessorInfo = getAccessorInfo(accessor);
  const statements = getFunctionBody(accessor.value);
  if (!fieldMap || !accessorInfo || !accessorIsPublic || !statements || statements.length > 1) {
    return null;
  }

  const matchingFields = findMatchingFields(fieldMap, accessorInfo.name);
  if (matchingFields.length == 0) {
    return null;
  }

  return {
    statement: statements.length == 0 ? null : statements[0],
    info: accessorInfo,
    matchingFields,
    node: accessor,
  };
}

function getDeclaringAccessorFieldMap(node: AccessorNode) {
  if (node.parent?.type === 'ObjectExpression') {
    return getObjectExpressionFieldMap(node.parent);
  } else if (node.parent?.type === 'ClassBody') {
    return getClassBodyFieldMap(node.parent);
  } else {
    return null;
  }
}

function getObjectExpressionFieldMap(node: TSESTree.ObjectExpression) {
  return getFieldMap(node.properties, prop => (isValidObjectField(prop) ? prop.key : null));
}

function getClassBodyFieldMap(classBody: TSESTree.ClassBody) {
  const fields = getFieldMap(classBody.body, classElement =>
    (classElement.type === 'PropertyDefinition' ||
      classElement.type === 'TSAbstractPropertyDefinition') &&
    !classElement.static
      ? classElement.key
      : null,
  );
  const fieldsFromConstructor = fieldsDeclaredInConstructorParameters(classBody);
  return new Map([...fields, ...fieldsFromConstructor]);
}

function getAccessorInfo(
  accessor: TSESTree.Property | TSESTree.MethodDefinition,
): AccessorInfo | null {
  let name = getName(accessor.key);
  if (!name) {
    return null;
  }

  name = name.toLowerCase();
  if (accessor.kind === 'get') {
    return { type: 'getter', name };
  } else if (accessor.kind === 'set') {
    return { type: 'setter', name };
  } else {
    return setterOrGetter(name, accessor.value);
  }
}

function getName(key: TSESTree.Node) {
  if (key.type === 'Literal') {
    return String(key.value);
  } else if (key.type === 'Identifier' || key.type === 'PrivateIdentifier') {
    return key.name;
  }
  return null;
}

function setterOrGetter(name: string, functionExpression: TSESTree.Node): AccessorInfo | null {
  if (functionExpression.type !== 'FunctionExpression') {
    return null;
  }

  if (name.startsWith('set') && functionExpression.params.length === 1) {
    return { type: 'setter', name: name.substring(3) };
  }
  if (name.startsWith('get') && functionExpression.params.length === 0) {
    return { type: 'getter', name: name.substring(3) };
  }

  return null;
}

function getFieldMap<T extends TSESTree.Node>(
  elements: T[],
  getPropertyName: (arg: T) => TSESTree.PropertyName | null,
) {
  const fields: Map<string, Field> = new Map<string, Field>();
  for (const element of elements) {
    const propertyNameNode = getPropertyName(element);
    if (propertyNameNode) {
      const name = getName(propertyNameNode);
      if (name) {
        fields.set(name.toLowerCase(), {
          name,
          node: element,
        });
      }
    }
  }
  return fields;
}

function isValidObjectField(prop: TSESTree.Node): prop is TSESTree.Property {
  return prop.type === 'Property' && !prop.method && prop.kind === 'init';
}

function fieldsDeclaredInConstructorParameters(containingClass: TSESTree.ClassBody) {
  const constr = getConstructorOf(containingClass);
  if (constr) {
    const fieldsFromConstructor = new Map<string, Field>();
    for (const parameter of constr.params) {
      if (
        parameter.type === 'TSParameterProperty' &&
        (parameter.accessibility || parameter.readonly)
      ) {
        const parameterName = getName(parameter.parameter);
        if (parameterName) {
          fieldsFromConstructor.set(parameterName, {
            name: parameterName,
            node: parameter,
          });
        }
      }
    }
    return fieldsFromConstructor;
  } else {
    return new Map<string, Field>();
  }
}

function getConstructorOf(
  containingClass: TSESTree.ClassBody,
): TSESTree.FunctionExpression | TSESTree.TSEmptyBodyFunctionExpression | undefined {
  for (const classElement of containingClass.body) {
    if (classElement.type === 'MethodDefinition' && getName(classElement.key) === 'constructor') {
      return classElement.value;
    }
  }
}

function findMatchingFields(currentFields: Map<string, Field>, name: string) {
  const underscoredTargetName1 = `_${name}`;
  const underscoredTargetName2 = `${name}_`;
  const exactFieldName = currentFields.get(name);
  const underscoreFieldName1 = currentFields.get(underscoredTargetName1);
  const underscoreFieldName2 = currentFields.get(underscoredTargetName2);
  return [exactFieldName, underscoreFieldName1, underscoreFieldName2].filter(
    field => field,
  ) as Field[];
}

function getFunctionBody(node: TSESTree.Node) {
  if (node.type !== 'FunctionExpression' || !node.body) {
    return null;
  }
  return node.body.body;
}

function getPropertyName(expression: TSESTree.Expression | null) {
  if (
    expression &&
    expression.type === 'MemberExpression' &&
    expression.object.type === 'ThisExpression'
  ) {
    return getName(expression.property);
  }
  return null;
}

function getFieldUsedInsideSimpleBody(statement: TSESTree.Statement, accessorInfo: AccessorInfo) {
  if (accessorInfo.type === 'setter') {
    if (
      statement.type === 'ExpressionStatement' &&
      statement.expression.type === 'AssignmentExpression'
    ) {
      return getPropertyName(statement.expression.left);
    }
  } else if (statement.type === 'ReturnStatement') {
    return getPropertyName(statement.argument);
  }
  return null;
}

function isUsingAccessorFieldInBody(
  statement: TSESTree.Statement,
  accessorInfo: AccessorInfo,
  matchingFields: Field[],
) {
  const usedField = getFieldUsedInsideSimpleBody(statement, accessorInfo);
  return !usedField || matchingFields.some(matchingField => usedField === matchingField.name);
}
