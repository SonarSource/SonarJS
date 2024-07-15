/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  getVariableFromName,
  interceptReport,
  isMethodInvocation,
  isStringLiteral,
  mergeRules,
  report,
  SONAR_RUNTIME,
  toSecondaryLocation,
} from '../helpers';
import { eslintRules } from '../core';
import rspecMeta from './meta.json';
import { JSONSchema4 } from '@typescript-eslint/utils/json-schema';

const getterReturnRule = eslintRules['getter-return'];
type AccessorNode = TSESTree.Property | TSESTree.MethodDefinition;

function isAccessorNode(node: TSESTree.Node | null | undefined): node is AccessorNode {
  return node?.type === 'Property' || node?.type === 'MethodDefinition';
}

// The 'definition' property says how the accessor is defined: that's to say if it's part of a class definition,
// an object literal or a property descriptor passed to one of the Object.defineProperty() variants.
// The 'refResolver' property is used to extract the reference name used by the accessor.
interface AccessorInfo {
  name: string;
  type: 'getter' | 'setter';
  definition: 'class' | 'object' | 'descriptor';
  refResolver: (expression: TSESTree.Expression | null) => string | null;
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
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    ...getterReturnRule.meta,
    schema: [
      ...(getterReturnRule.meta!.schema as JSONSchema4[]),
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  }),
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

const getterReturnDecorator = decorateGetterReturn(getterReturnRule);

const noAccessorFieldMismatchRule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    // Stack of nested object or class fields
    const currentFieldsStack = [new Map<string, Field>()];

    // Selector of a single property descriptor used in Object.defineProperty() or Reflect.defineProperty()
    const singleDescriptorAccessorSelector = [
      'CallExpression[arguments.1.type=Literal]',
      'ObjectExpression:nth-child(3)',
      'Property[value.type=FunctionExpression][key.name=/^[gs]et$/]',
    ].join(' > ');

    // Selector of multiple property descriptors used in Object.defineProperties() or Object.create()
    const multiDescriptorsAccessorSelector = [
      'CallExpression',
      'ObjectExpression:nth-child(2)',
      'Property:matches([key.type=Identifier], [key.type=Literal])',
      'ObjectExpression',
      'Property[value.type=FunctionExpression][key.name=/^[gs]et$/]',
    ].join(' > ');

    return {
      // Check Object literal properties or Class method definitions
      'Property,MethodDefinition': (node: estree.Node) => {
        const accessorNode = node as AccessorNode;
        const accessorInfo = getObjectOrClassAccessorInfo(accessorNode);
        if (accessorInfo) {
          const fieldMap = currentFieldsStack[currentFieldsStack.length - 1];
          checkAccessorNode(context, accessorNode, fieldMap, accessorInfo);
        }
      },

      // Check Object.defineProperty() or Reflect.defineProperty()
      [singleDescriptorAccessorSelector]: (node: estree.Node) => {
        const accessorNode = node as TSESTree.Property;
        const accessorInfo = getSingleDescriptorAccessorInfo(accessorNode);
        if (accessorInfo) {
          const fieldMap = getSingleVariableFieldMap(context, accessorInfo.name, node);
          checkAccessorNode(context, accessorNode, fieldMap, accessorInfo);
        }
      },

      // Check Object.defineProperties() or Object.create()
      [multiDescriptorsAccessorSelector]: (node: estree.Node) => {
        const accessorNode = node as TSESTree.Property;
        const accessorInfo = getMultiDescriptorsAccessorInfo(accessorNode);
        if (accessorInfo) {
          const fieldMap = getSingleVariableFieldMap(context, accessorInfo.name, node);
          checkAccessorNode(context, accessorNode, fieldMap, accessorInfo);
        }
      },

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

function checkAccessorNode(
  context: Rule.RuleContext,
  node: AccessorNode,
  fieldMap: Map<string, Field>,
  info: AccessorInfo,
) {
  const accessor = getAccessor(node, fieldMap, info);
  if (accessor == null || isReportedByGetterReturnDecorator(accessor)) {
    return;
  }

  if (!isUsingAccessorFieldInBody(accessor)) {
    reportWithSecondaryLocation(context, accessor);
  }
}

// ESLint 'getter-return' reports for empty getters
// or empty property descriptor get functions.
function isReportedByGetterReturnDecorator(accessor: Accessor) {
  const info = accessor.info;
  const emptyGetter = info.type === 'getter' && accessor.statement == null;
  return emptyGetter && (info.definition === 'descriptor' || accessor.node.kind === 'get');
}

function reportWithFieldLocation(context: Rule.RuleContext, node: TSESTree.Node | undefined) {
  if (!node || !isAccessorNode(node)) {
    return false;
  }
  const info = getNodeAccessorInfo(node);
  if (!info) {
    return false;
  }
  const fieldMap = getNodeFieldMap(context, node.parent, info);
  const accessor = getAccessor(node, fieldMap, info);
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
  report(context, { ...descriptor, message });
}

function reportWithSecondaryLocation(context: Rule.RuleContext, accessor: Accessor) {
  const fieldToRefer = accessor.matchingFields[0];
  const ref = accessor.info.definition === 'descriptor' ? 'variable' : 'property';
  const primaryMessage =
    `Refactor this ${accessor.info.type} ` +
    `so that it actually refers to the ${ref} '${fieldToRefer.name}'.`;

  report(
    context,
    {
      message: primaryMessage,
      loc: accessor.node.key.loc,
    },
    [
      toSecondaryLocation(
        fieldToRefer.node,
        `${ref[0].toUpperCase()}${ref.slice(1)} which should be referred.`,
      ),
    ],
  );
}

function isPropertyDefinitionCall(call: estree.CallExpression | undefined) {
  const objects = ['Object', 'Reflect'];
  const method = 'defineProperty';
  const minArgs = 3;
  return call && objects.some(object => isMethodInvocation(call, object, method, minArgs));
}

function isPropertiesDefinitionCall(call: estree.CallExpression | undefined) {
  const object = 'Object';
  const methods = ['defineProperties', 'create'];
  const minArgs = 2;
  return call && methods.some(methodName => isMethodInvocation(call, object, methodName, minArgs));
}

function getAccessor(
  accessor: AccessorNode,
  fieldMap: Map<string, Field> | null,
  info: AccessorInfo,
) {
  const accessorIsPublic =
    accessor.type !== 'MethodDefinition' ||
    accessor.accessibility == null ||
    accessor.accessibility === 'public';
  const statements = getFunctionBody(accessor.value);
  if (!fieldMap || !accessorIsPublic || !statements || statements.length > 1) {
    return null;
  }

  const matchingFields = findMatchingFields(fieldMap, info.name);
  if (matchingFields.length === 0) {
    return null;
  }

  return {
    statement: statements.length === 0 ? null : statements[0],
    info,
    matchingFields,
    node: accessor,
  };
}

function getNodeAccessorInfo(accessorNode: AccessorNode) {
  if (accessorNode.type === 'MethodDefinition') {
    return getObjectOrClassAccessorInfo(accessorNode);
  } else {
    return (
      getMultiDescriptorsAccessorInfo(accessorNode) ??
      getSingleDescriptorAccessorInfo(accessorNode) ??
      getObjectOrClassAccessorInfo(accessorNode)
    );
  }
}

function getSingleDescriptorAccessorInfo(accessorNode: TSESTree.Property) {
  const callNode = findParentCallExpression(accessorNode);
  const propertyNode = callNode?.arguments[1];
  if (!isPropertyDefinitionCall(callNode) || !propertyNode || !isStringLiteral(propertyNode)) {
    return null;
  }
  return getDescriptorAccessorInfo(String(propertyNode.value), accessorNode);
}

function getMultiDescriptorsAccessorInfo(accessorNode: TSESTree.Property) {
  const callNode = findParentCallExpression(accessorNode);
  const propertyNode = accessorNode.parent?.parent;
  if (!isPropertiesDefinitionCall(callNode) || propertyNode?.type !== 'Property') {
    return null;
  }
  const propertyName = getName(propertyNode.key);
  if (!propertyName) {
    return null;
  }
  return getDescriptorAccessorInfo(propertyName, accessorNode);
}

function getDescriptorAccessorInfo(name: string, accessor: TSESTree.Property): AccessorInfo | null {
  const key = getName(accessor.key);
  if (key == null) {
    return null;
  } else {
    // Name is not set to lower-case as we can't search variables in a case-insensitive way.
    return {
      type: key === 'get' ? 'getter' : 'setter',
      name,
      definition: 'descriptor',
      refResolver: getIdentifierName,
    };
  }
}

function getObjectOrClassAccessorInfo(accessor: AccessorNode): AccessorInfo | null {
  let name = getName(accessor.key);
  if (!name) {
    return null;
  }

  name = name.toLowerCase();
  let type: AccessorInfo['type'] | null = null;

  if (accessor.kind === 'get') {
    type = 'getter';
  } else if (accessor.kind === 'set') {
    type = 'setter';
  } else if (accessor.value.type === 'FunctionExpression') {
    const offset = 3;
    const params = accessor.value.params;
    if (name.startsWith('set') && name.length > offset && params.length === 1) {
      type = 'setter';
      name = name.substring(offset);
    } else if (name.startsWith('get') && name.length > offset && params.length === 0) {
      type = 'getter';
      name = name.substring(offset);
    }
  }

  if (type == null) {
    return null;
  }

  return {
    type,
    name,
    definition: accessor.type === 'Property' ? 'object' : 'class',
    refResolver: getPropertyName,
  };
}

function findParentCallExpression(node: TSESTree.Property) {
  const parent = node.parent?.parent;
  const candidates = [parent, parent?.parent?.parent];
  return candidates.find(node => node?.type === 'CallExpression') as estree.CallExpression;
}

function getName(key: TSESTree.Node) {
  if (key.type === 'Literal') {
    return String(key.value);
  } else if (key.type === 'Identifier' || key.type === 'PrivateIdentifier') {
    return key.name;
  }
  return null;
}

function getNodeFieldMap(context: Rule.RuleContext, node: TSESTree.Node, info: AccessorInfo) {
  if (info.definition === 'descriptor') {
    return getSingleVariableFieldMap(context, info.name, node as estree.Node);
  } else if (node?.type === 'ObjectExpression') {
    return getObjectExpressionFieldMap(node);
  } else if (node?.type === 'ClassBody') {
    return getClassBodyFieldMap(node);
  } else {
    return null;
  }
}

function getSingleVariableFieldMap(context: Rule.RuleContext, name: string, node: estree.Node) {
  const fieldMap = new Map<string, Field>();
  for (const candidate of [name, `_${name}`, `${name}_`]) {
    const variable = getVariableFromName(context, candidate, node);
    if (variable != null && variable.defs.length > 0) {
      fieldMap.set(candidate, { name: candidate, node: variable.defs[0].node });
      break;
    }
  }
  return fieldMap;
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

function getFieldMap<T extends TSESTree.Node>(
  elements: T[],
  getPropertyName: (arg: T) => TSESTree.PropertyName | null,
) {
  const fields = new Map<string, Field>();
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
  const fieldsFromConstructor = new Map<string, Field>();
  const constr = getConstructorOf(containingClass);
  if (!constr) {
    return fieldsFromConstructor;
  }
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

function getPropertyName(expression: TSESTree.Expression | null): string | null {
  if (
    expression &&
    expression.type === 'MemberExpression' &&
    expression.object.type === 'ThisExpression'
  ) {
    return getName(expression.property);
  }
  return null;
}

function getIdentifierName(expression: TSESTree.Expression | null): string | null {
  return expression?.type === 'Identifier' ? expression.name : null;
}

function getFieldUsedInsideSimpleBody(statement: TSESTree.Statement, accessorInfo: AccessorInfo) {
  if (accessorInfo.type === 'setter') {
    if (
      statement.type === 'ExpressionStatement' &&
      statement.expression.type === 'AssignmentExpression'
    ) {
      return accessorInfo.refResolver(statement.expression.left);
    }
  } else if (statement.type === 'ReturnStatement') {
    return accessorInfo.refResolver(statement.argument);
  }
  return null;
}

function isUsingAccessorFieldInBody(accessor: Accessor) {
  if (accessor.statement == null) {
    return false;
  }
  const usedField = getFieldUsedInsideSimpleBody(accessor.statement, accessor.info);
  if (!usedField) {
    return true;
  }
  return accessor.matchingFields.some(matchingField => usedField === matchingField.name);
}
