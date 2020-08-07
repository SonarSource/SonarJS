/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-2598

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import {
  getModuleNameOfIdentifier,
  getModuleNameOfImportedIdentifier,
  getUniqueWriteUsage,
  getVariableFromName,
} from './utils';

const FORMIDABLE_MODULE = 'formidable';
const KEEP_EXTENSIONS = 'keepExtensions';
const UPLOAD_DIR = 'uploadDir';

const formidableObjects: Map<
  Scope.Variable,
  { uploadDirSet: boolean; keepExtensions: boolean; callExpression: estree.CallExpression }
> = new Map();

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      NewExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.NewExpression, context),
      CallExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.CallExpression, context),
      AssignmentExpression: (node: estree.Node) =>
        visitAssignment(node as estree.AssignmentExpression, context),
      Program: () => formidableObjects.clear(),
      'Program:exit': () => {
        formidableObjects.forEach(value =>
          report(value.uploadDirSet, value.keepExtensions, value.callExpression, context),
        );
      },
    };
  },
};

function checkCallExpression(callExpression: estree.CallExpression, context: Rule.RuleContext) {
  const { callee } = callExpression;

  if (callee.type !== 'Identifier') {
    return;
  }

  const moduleName =
    getModuleNameOfImportedIdentifier(callee, context) ||
    getModuleNameOfIdentifier(callee, context);
  if (moduleName?.value === FORMIDABLE_MODULE) {
    if (callExpression.arguments.length === 0) {
      checkOptionsSetAfter(callExpression, context);
      return;
    }

    let [options] = callExpression.arguments;

    if (options.type === 'Identifier') {
      const usage = getUniqueWriteUsage(context, options.name);
      if (usage && usage.type === 'ObjectExpression') {
        options = usage;
      }
    }

    if (options.type === 'ObjectExpression') {
      report(
        !!getValue(options, UPLOAD_DIR),
        keepExtensionsValue(getValue(options, KEEP_EXTENSIONS)),
        callExpression,
        context,
      );
    }
  }
}

function checkOptionsSetAfter(callExpression: estree.CallExpression, context: Rule.RuleContext) {
  const parent = context.getAncestors()[context.getAncestors().length - 1];
  let formIdentifier: estree.Identifier | undefined;
  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    formIdentifier = parent.id;
  } else if (parent.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
    formIdentifier = parent.left;
  }
  if (formIdentifier) {
    const formVariable = getVariableFromName(context, formIdentifier.name);
    if (formVariable) {
      formidableObjects.set(formVariable, {
        uploadDirSet: false,
        keepExtensions: false,
        callExpression,
      });
    }
  }
}

function keepExtensionsValue(extensionValue?: estree.Node): boolean {
  if (
    extensionValue &&
    extensionValue.type === 'Literal' &&
    typeof extensionValue.value === 'boolean'
  ) {
    return extensionValue.value;
  }

  return false;
}

function getValue(options: estree.ObjectExpression, key: string) {
  const property = options.properties
    .filter(prop => prop.type === 'Property')
    .map(prop => prop as estree.Property)
    .find(prop => prop.key.type === 'Identifier' && prop.key.name === key);
  if (!property) {
    return undefined;
  } else {
    return property.value;
  }
}

function visitAssignment(assignment: estree.AssignmentExpression, context: Rule.RuleContext) {
  if (assignment.left.type !== 'MemberExpression') {
    return;
  }

  const memberExpr = assignment.left;
  if (memberExpr.object.type === 'Identifier' && memberExpr.property.type === 'Identifier') {
    const variable = getVariableFromName(context, memberExpr.object.name);

    if (variable && formidableObjects.has(variable)) {
      const formOptions = formidableObjects.get(variable)!;
      if (memberExpr.property.name === UPLOAD_DIR) {
        formOptions.uploadDirSet = true;
      }

      if (memberExpr.property.name === KEEP_EXTENSIONS) {
        formOptions.keepExtensions = keepExtensionsValue(assignment.right);
      }
    }
  }
}

function report(
  uploadDirSet: boolean,
  keepExtensions: boolean,
  callExpression: estree.CallExpression,
  context: Rule.RuleContext,
) {
  let message;

  if (keepExtensions && uploadDirSet) {
    message = 'Restrict the extension of uploaded files.';
  } else if (!keepExtensions && !uploadDirSet) {
    message = 'Restrict folder destination of uploaded files.';
  } else if (keepExtensions && !uploadDirSet) {
    message = 'Restrict the extension and folder destination of uploaded files.';
  }

  if (message) {
    context.report({ message, node: callExpression });
  }
}
