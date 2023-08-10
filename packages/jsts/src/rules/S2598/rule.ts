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
// https://sonarsource.github.io/rspec/#/rspec/S2598/javascript

import { TSESTree } from '@typescript-eslint/experimental-utils';
import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import {
  getLhsVariable,
  getValueOfExpression,
  getObjectExpressionProperty,
  getVariableFromName,
  toEncodedMessage,
  getFullyQualifiedName,
} from '../helpers';
import { SONAR_RUNTIME } from '../../linter/parameters';

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
        enum: [SONAR_RUNTIME],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    return {
      NewExpression(node: estree.Node) {
        checkCallExpression(context, node as estree.NewExpression);
      },
      CallExpression(node: estree.Node) {
        checkCallExpression(context, node as estree.CallExpression);
      },
      AssignmentExpression(node: estree.Node) {
        visitAssignment(context, node as estree.AssignmentExpression);
      },
      Program() {
        formidableObjects.clear();
      },
      'Program:exit'() {
        formidableObjects.forEach(value =>
          report(context, value.uploadDirSet, value.keepExtensions, value.callExpression),
        );
      },
    };
  },
};

function checkCallExpression(context: Rule.RuleContext, callExpression: estree.CallExpression) {
  const { callee } = callExpression;
  if (callee.type !== 'Identifier') {
    return;
  }

  const fqn = getFullyQualifiedName(context, callee);
  if (!fqn) {
    return;
  }
  const [moduleName] = fqn.split('.');

  if (moduleName === FORMIDABLE_MODULE) {
    checkFormidable(context, callExpression);
  }

  if (moduleName === MULTER_MODULE) {
    checkMulter(context, callExpression);
  }
}

function checkFormidable(context: Rule.RuleContext, callExpression: estree.CallExpression) {
  if (callExpression.arguments.length === 0) {
    const formVariable = getLhsVariable(context);
    if (formVariable) {
      formidableObjects.set(formVariable, {
        uploadDirSet: false,
        keepExtensions: false,
        callExpression,
      });
    }
    return;
  }

  const options = getValueOfExpression(context, callExpression.arguments[0], 'ObjectExpression');
  if (options) {
    report(
      context,
      !!getObjectExpressionProperty(options, UPLOAD_DIR),
      keepExtensionsValue(getObjectExpressionProperty(options, KEEP_EXTENSIONS)?.value),
      callExpression,
    );
  }
}

function checkMulter(context: Rule.RuleContext, callExpression: estree.CallExpression) {
  if (callExpression.arguments.length === 0) {
    return;
  }
  const multerOptions = getValueOfExpression(
    context,
    callExpression.arguments[0],
    'ObjectExpression',
  );

  if (!multerOptions) {
    return;
  }

  const storagePropertyValue = getObjectExpressionProperty(multerOptions, STORAGE_OPTION)?.value;
  if (storagePropertyValue) {
    const storageValue = getValueOfExpression(context, storagePropertyValue, 'CallExpression');

    if (storageValue) {
      const diskStorageCallee = getDiskStorageCalleeIfUnsafeStorage(context, storageValue);
      if (diskStorageCallee) {
        report(context, false, false, callExpression, {
          node: diskStorageCallee,
          message: 'no destination specified',
        });
      }
    }
  }
}

function getDiskStorageCalleeIfUnsafeStorage(
  context: Rule.RuleContext,
  storageCreation: estree.CallExpression,
) {
  const { arguments: args, callee } = storageCreation;
  if (args.length > 0 && isMemberWithProperty(callee, 'diskStorage')) {
    const storageOptions = getValueOfExpression(context, args[0], 'ObjectExpression');
    if (storageOptions && !getObjectExpressionProperty(storageOptions, DESTINATION_OPTION)) {
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

function visitAssignment(context: Rule.RuleContext, assignment: estree.AssignmentExpression) {
  const variableProperty = getVariablePropertyFromAssignment(context, assignment);
  if (!variableProperty) {
    return;
  }

  const { objectVariable, property } = variableProperty;

  if (formidableObjects.has(objectVariable)) {
    const formOptions = formidableObjects.get(objectVariable)!;
    if (property === UPLOAD_DIR) {
      formOptions.uploadDirSet = true;
    }

    if (property === KEEP_EXTENSIONS) {
      formOptions.keepExtensions = keepExtensionsValue(assignment.right);
    }
  }
}

/**
 * for `x.foo = 42` returns 'x' variable and 'foo' property string
 */
export function getVariablePropertyFromAssignment(
  context: Rule.RuleContext,
  assignment: estree.AssignmentExpression,
): { objectVariable: Scope.Variable; property: string } | undefined {
  if (assignment.left.type !== 'MemberExpression') {
    return undefined;
  }

  const memberExpr = assignment.left;
  if (memberExpr.object.type === 'Identifier' && memberExpr.property.type === 'Identifier') {
    const objectVariable = getVariableFromName(context, memberExpr.object.name);
    if (objectVariable) {
      return { objectVariable, property: memberExpr.property.name };
    }
  }

  return undefined;
}

function report(
  context: Rule.RuleContext,
  uploadDirSet: boolean,
  keepExtensions: boolean,
  callExpression: estree.CallExpression,
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
      message = toEncodedMessage(
        message,
        [secondaryLocation.node as TSESTree.Node],
        [secondaryLocation.message],
      );
    } else {
      message = toEncodedMessage(message, []);
    }

    context.report({
      message,
      node: callExpression.callee,
    });
  }
}
