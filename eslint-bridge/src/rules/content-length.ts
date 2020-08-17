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
// https://jira.sonarsource.com/browse/RSPEC-5693

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import {
  getModuleNameOfIdentifier,
  getModuleNameOfImportedIdentifier,
  getValueOfExpression,
  getLhsVariable,
} from './utils';
import { getVariablePropertyFromAssignment } from './file-uploads';

const FORMIDABLE_MODULE = 'formidable';
const MAX_FILE_SIZE = 'maxFileSize';
const FORMIDABLE_DEFAULT_SIZE = 200 * 1024 * 1024;

const MULTER_MODULE = 'multer';
const LIMITS_OPTION = 'limits';
const FILE_SIZE_OPTION = 'fileSize';

const formidableObjects: Map<
  Scope.Variable,
  { maxFileSize: number; nodeToReport: estree.Node }
> = new Map();

export const rule: Rule.RuleModule = {
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
        formidableObjects.forEach(value => report(context, value.nodeToReport, value.maxFileSize));
      },
    };
  },
};

function checkCallExpression(context: Rule.RuleContext, callExpression: estree.CallExpression) {
  const { callee } = callExpression;

  if (callee.type !== 'Identifier') {
    return;
  }

  const moduleName =
    getModuleNameOfImportedIdentifier(callee, context) ||
    getModuleNameOfIdentifier(callee, context);

  if (moduleName?.value === FORMIDABLE_MODULE) {
    checkFormidable(context, callExpression);
  }

  if (moduleName?.value === MULTER_MODULE) {
    checkMulter(context, callExpression);
  }
}

function checkFormidable(context: Rule.RuleContext, callExpression: estree.CallExpression) {
  if (callExpression.arguments.length === 0) {
    // options will be set later through member assignment
    const formVariable = getLhsVariable(context);
    if (formVariable) {
      formidableObjects.set(formVariable, {
        maxFileSize: FORMIDABLE_DEFAULT_SIZE,
        nodeToReport: callExpression,
      });
    }
    return;
  }

  const options = getValueOfExpression<estree.ObjectExpression>(
    context,
    callExpression.arguments[0],
    'ObjectExpression',
  );
  if (options) {
    const property = getProperty(options, MAX_FILE_SIZE);
    checkSize(context, callExpression, property, FORMIDABLE_DEFAULT_SIZE);
  }
}

function checkMulter(context: Rule.RuleContext, callExpression: estree.CallExpression) {
  if (callExpression.arguments.length === 0) {
    report(context, callExpression.callee);
    return;
  }
  const multerOptions = getValueOfExpression<estree.ObjectExpression>(
    context,
    callExpression.arguments[0],
    'ObjectExpression',
  );

  if (!multerOptions) {
    return;
  }

  const limitsPropertyValue = getProperty(multerOptions, LIMITS_OPTION)?.value;
  if (limitsPropertyValue && limitsPropertyValue.type === 'ObjectExpression') {
    const fileSizeProperty = getProperty(limitsPropertyValue, FILE_SIZE_OPTION);
    checkSize(context, callExpression, fileSizeProperty);
  }

  if (!limitsPropertyValue) {
    report(context, callExpression.callee);
  }
}

function checkSize(
  context: Rule.RuleContext,
  callExpr: estree.CallExpression,
  property?: estree.Property,
  defaultLimit?: number,
) {
  if (property) {
    const maxFileSizeValue = getLiteralNumericValue(context, property.value);
    if (maxFileSizeValue) {
      report(context, property, maxFileSizeValue);
    }
  } else {
    report(context, callExpr, defaultLimit);
  }
}

function getProperty(options: estree.ObjectExpression, key: string) {
  const property = options.properties
    .filter(prop => prop.type === 'Property')
    .map(prop => prop as estree.Property)
    .find(prop => prop.key.type === 'Identifier' && prop.key.name === key);
  if (!property) {
    return undefined;
  } else {
    return property;
  }
}

function visitAssignment(context: Rule.RuleContext, assignment: estree.AssignmentExpression) {
  const variableProperty = getVariablePropertyFromAssignment(context, assignment);
  if (!variableProperty) {
    return;
  }

  const { objectVariable, property } = variableProperty;

  if (formidableObjects.has(objectVariable) && property === MAX_FILE_SIZE) {
    const formOptions = formidableObjects.get(objectVariable)!;
    const rhsValue = getLiteralNumericValue(context, assignment.right);
    if (rhsValue !== undefined) {
      formOptions.maxFileSize = rhsValue;
      formOptions.nodeToReport = assignment;
    } else {
      formidableObjects.delete(objectVariable);
    }
  }
}

function getLiteralNumericValue(context: Rule.RuleContext, node: estree.Node): number | undefined {
  const literal = getValueOfExpression<estree.Literal>(context, node, 'Literal');
  if (literal && typeof literal.value === 'number') {
    return literal.value;
  }
  return undefined;
}

function report(context: Rule.RuleContext, nodeToReport: estree.Node, size?: number) {
  const [fileUploadSizeLimit] = context.options;
  if (!size || size > fileUploadSizeLimit) {
    context.report({
      message: 'Make sure the content length limit is safe here.',
      node: nodeToReport,
    });
  }
}
