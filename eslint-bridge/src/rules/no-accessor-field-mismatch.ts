/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-4275

import { Rule } from "eslint";
import * as estree from "estree";
import { TSESTree } from "@typescript-eslint/experimental-utils";
import { toEncodedMessage } from "./utils";

interface AccessorInfo {
  type: "getter" | "setter";
  name: string;
}

interface Field {
  name: string;
  node: TSESTree.Node;
}

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ["sonar-runtime"],
      },
    ],
  },

  create(context: Rule.RuleContext) {
    function checkAccessor(accessor: TSESTree.Property | TSESTree.MethodDefinition) {
      const accessorIsPublic =
        accessor.type !== "MethodDefinition" || accessor.accessibility === "public";
      const accessorInfo = getAccessorInfo(accessor);
      const statements = getFunctionBody(accessor.value);
      if (!accessorInfo || !accessorIsPublic || !statements || statements.length > 1) {
        return;
      }

      const fields = getFields(accessor.parent as TSESTree.Node);
      const matchingFields = fields.filter(field => fieldNameMatch(field.name, accessorInfo.name));
      if (
        matchingFields.length > 0 &&
        (statements.length === 0 ||
          !isUsingAccessorFieldInBody(statements[0], accessorInfo, matchingFields))
      ) {
        const fieldToRefer = matchingFields[0];
        const primaryMessage = `Refactor this ${
          accessorInfo.type
        } so that it actually refers to the property '${fieldToRefer.name}'.`;
        const secondaryLocations = [fieldToRefer.node];
        const secondaryMessages = ["Property which should be referred."];

        context.report({
          message: toEncodedMessage(primaryMessage, secondaryLocations, secondaryMessages),
          loc: accessor.key.loc,
        });
      }
    }

    return {
      Property: (node: estree.Node) => checkAccessor(node as TSESTree.Property),
      MethodDefinition: (node: estree.Node) => checkAccessor(node as TSESTree.MethodDefinition),
    };
  },
};

function getAccessorInfo(
  accessor: TSESTree.Property | TSESTree.MethodDefinition,
): AccessorInfo | null {
  let name = getName(accessor.key);
  if (!name) {
    return null;
  }

  name = name.toLowerCase();
  if (accessor.kind === "get") {
    return { type: "getter", name };
  } else if (accessor.kind === "set") {
    return { type: "setter", name };
  } else {
    return setterOrGetter(name, accessor.value);
  }
}

function getName(key: TSESTree.Node) {
  if (key.type === "Literal") {
    return String(key.value);
  } else if (key.type === "Identifier") {
    return key.name;
  }
  return null;
}

function setterOrGetter(name: string, functionExpression: TSESTree.Node): AccessorInfo | null {
  if (functionExpression.type !== "FunctionExpression") {
    return null;
  }

  if (name.startsWith("set") && functionExpression.params.length === 1) {
    return { type: "setter", name: name.substring(3) };
  }
  if (name.startsWith("get") && functionExpression.params.length === 0) {
    return { type: "getter", name: name.substring(3) };
  }

  return null;
}

function getFields(parent: TSESTree.Node): Field[] {
  if (parent.type === "ClassBody") {
    const fields = mapToField(
      parent.body,
      classElement =>
        classElement.type === "ClassProperty" || classElement.type === "TSAbstractClassProperty"
          ? classElement.key
          : null,
    );
    const fieldsFromConstructor = fieldsDeclaredInConstructorParameters(parent);
    return [...fields, ...fieldsFromConstructor];
  } else if (parent.type === "ObjectExpression") {
    return mapToField(parent.properties, prop => (prop.type === "Property" ? prop.key : null));
  } else {
    return [];
  }
}

function mapToField<T extends TSESTree.Node>(
  elements: T[],
  getPropertyName: (arg: T) => TSESTree.PropertyName | null,
) {
  const fields: Field[] = [];
  for (const element of elements) {
    const propertyNameNode = getPropertyName(element);
    if (propertyNameNode) {
      const name = getName(propertyNameNode);
      if (name) {
        fields.push({
          name,
          node: element,
        });
      }
    }
  }
  return fields;
}

function fieldsDeclaredInConstructorParameters(containingClass: TSESTree.ClassBody) {
  const constr = getConstructorOf(containingClass);
  if (constr) {
    const fieldsFromConstructor: Field[] = [];
    for (const parameter of constr.params) {
      if (
        parameter.type === "TSParameterProperty" &&
        (parameter.accessibility || parameter.readonly)
      ) {
        const parameterName = getName(parameter.parameter);
        if (parameterName) {
          fieldsFromConstructor.push({
            name: parameterName,
            node: parameter,
          });
        }
      }
    }
    return fieldsFromConstructor;
  } else {
    return [];
  }
}

function getConstructorOf(
  containingClass: TSESTree.ClassBody,
): TSESTree.FunctionExpression | TSESTree.TSEmptyBodyFunctionExpression | undefined {
  for (const classElement of containingClass.body) {
    if (classElement.type === "MethodDefinition" && getName(classElement.key) === "constructor") {
      return classElement.value;
    }
  }
}

function fieldNameMatch(fieldName: string, name: string) {
  const fieldNameLowerCase = fieldName.toLowerCase();
  const underscoredTargetName = `_${name}`;
  return fieldNameLowerCase === name || fieldNameLowerCase === underscoredTargetName;
}

function getFunctionBody(node: TSESTree.Node) {
  if (node.type !== "FunctionExpression" || !node.body) {
    return null;
  }
  return node.body.body;
}

function getPropertyName(expression: TSESTree.Expression | null) {
  if (
    expression &&
    expression.type === "MemberExpression" &&
    expression.object.type === "ThisExpression"
  ) {
    return getName(expression.property);
  }
  return null;
}

function getFieldUsedInsideSimpleBody(statement: TSESTree.Statement, accessorInfo: AccessorInfo) {
  if (accessorInfo.type === "setter") {
    if (
      statement.type === "ExpressionStatement" &&
      statement.expression.type === "AssignmentExpression"
    ) {
      return getPropertyName(statement.expression.left);
    }
  } else if (statement.type === "ReturnStatement") {
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
