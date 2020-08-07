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
  toEncodedMessage,
} from './utils';

const FORMIDABLE_MODULE = 'formidable';
const KEEP_EXTENSIONS = 'keepExtensions';
const UPLOAD_DIR = 'uploadDir';

const MULTER_MODULE = 'multer';
const STORAGE_OPTION = 'storage';
const DESTINATION_OPTION = 'destination';

const formidableObjects: Map<
  Scope.Variable,
  { uploadDirSet: boolean; keepExtensions: boolean; callExpression: estree.CallExpression }
> = new Map();

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    return {
      NewExpression(node: estree.Node) {
        checkCallExpression(node as estree.NewExpression, context);
      },
      CallExpression(node: estree.Node) {
        checkCallExpression(node as estree.CallExpression, context);
      },
      AssignmentExpression(node: estree.Node) {
        visitAssignment(node as estree.AssignmentExpression, context);
      },
      Program() {
        formidableObjects.clear();
      },
      'Program:exit'() {
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
    checkFormidable(callExpression, context);
  }

  if (moduleName?.value === MULTER_MODULE) {
    checkMulter(callExpression, context);
  }
}

function checkFormidable(callExpression: estree.CallExpression, context: Rule.RuleContext) {
  if (callExpression.arguments.length === 0) {
    checkOptionsSetAfter(callExpression, context);
    return;
  }

  const options = getValueOfExpression<estree.ObjectExpression>(
    callExpression.arguments[0],
    'ObjectExpression',
    context,
  );
  if (options) {
    report(
      !!getValue(options, UPLOAD_DIR),
      keepExtensionsValue(getValue(options, KEEP_EXTENSIONS)),
      callExpression,
      context,
    );
  }
}

function checkMulter(callExpression: estree.CallExpression, context: Rule.RuleContext) {
  if (callExpression.arguments.length === 0) {
    return;
  }
  const multerOptions = getValueOfExpression<estree.ObjectExpression>(
    callExpression.arguments[0],
    'ObjectExpression',
    context,
  );

  if (!multerOptions) {
    return;
  }

  const storagePropertyValue = getValue(multerOptions, STORAGE_OPTION);
  if (storagePropertyValue) {
    const storageValue = getValueOfExpression<estree.CallExpression>(
      storagePropertyValue,
      'CallExpression',
      context,
    );

    if (storageValue) {
      const diskStorageCallee = getDiskStorageCalleeIfUnsafeStorage(storageValue, context);
      if (diskStorageCallee) {
        report(false, false, callExpression, context, {
          node: diskStorageCallee,
          message: 'no destination specified',
        });
      }
    }
  }
}

function getDiskStorageCalleeIfUnsafeStorage(
  storageCreation: estree.CallExpression,
  context: Rule.RuleContext,
) {
  const { arguments: args, callee } = storageCreation;
  if (args.length > 0 && isMemberWithProperty(callee, 'diskStorage')) {
    const storageOptions = getValueOfExpression<estree.ObjectExpression>(
      args[0],
      'ObjectExpression',
      context,
    );
    if (storageOptions && !getValue(storageOptions, DESTINATION_OPTION)) {
      return callee;
    }
  }

  return false;
}

function isMemberWithProperty(expr: estree.Node, property: string) {
  return (
    expr.type === 'MemberExpression' &&
    expr.property.type === 'Identifier' &&
    expr.property.name === property
  );
}

function getValueOfExpression<T>(
  expr: estree.Node,
  type: string,
  context: Rule.RuleContext,
): T | undefined {
  if (expr.type === 'Identifier') {
    const usage = getUniqueWriteUsage(context, expr.name);
    if (usage && usage.type === type) {
      return (usage as any) as T;
    }
  }

  if (expr.type === type) {
    return (expr as any) as T;
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
  secondaryLocation?: { node: estree.Node; message: string },
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
    if (secondaryLocation) {
      message = toEncodedMessage(message, [secondaryLocation.node], [secondaryLocation.message]);
    } else {
      message = toEncodedMessage(message, []);
    }

    context.report({
      message,
      node: callExpression.callee,
    });
  }
}
