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
// https://sonarsource.github.io/rspec/#/rspec/S5693/javascript

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { getVariablePropertyFromAssignment } from '../S2598/rule.ts';
import { parse } from 'bytes';
import {
  generateMeta,
  getFullyQualifiedName,
  getLhsVariable,
  getProperty,
  getValueOfExpression,
} from '../helpers/index.ts';
import { FromSchema } from 'json-schema-to-ts';
import { meta, schema } from './meta.ts';

const FORMIDABLE_MODULE = 'formidable';
const MAX_FILE_SIZE = 'maxFileSize';
const FORMIDABLE_DEFAULT_SIZE = 200 * 1024 * 1024;

const MULTER_MODULE = 'multer';
const LIMITS_OPTION = 'limits';
const FILE_SIZE_OPTION = 'fileSize';

const BODY_PARSER_MODULE = 'body-parser';
const BODY_PARSER_DEFAULT_SIZE = parse('100kb');

const formidableObjects: Map<Scope.Variable, { maxFileSize: number; nodeToReport: estree.Node }> =
  new Map();

const DEFAULT_OPTIONS = {
  fileUploadSizeLimit: 8_000_000,
  standardSizeLimit: 2_000_000,
};

const messages = {
  safeLimit: 'Make sure the content length limit is safe here.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, { messages, schema }),
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
  let identifierFromModule: estree.Identifier;
  if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
    identifierFromModule = callee.object;
  } else if (callee.type === 'Identifier') {
    identifierFromModule = callee;
  } else {
    return;
  }

  const fqn = getFullyQualifiedName(context, identifierFromModule);
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

  if (moduleName === BODY_PARSER_MODULE) {
    checkBodyParser(context, callExpression);
  }
}

function checkFormidable(context: Rule.RuleContext, callExpression: estree.CallExpression) {
  if (callExpression.arguments.length === 0) {
    // options will be set later through member assignment
    const formVariable = getLhsVariable(context, callExpression);
    if (formVariable) {
      formidableObjects.set(formVariable, {
        maxFileSize: FORMIDABLE_DEFAULT_SIZE,
        nodeToReport: callExpression,
      });
    }
    return;
  }

  const options = getValueOfExpression(context, callExpression.arguments[0], 'ObjectExpression');
  if (options) {
    const property = getProperty(options, MAX_FILE_SIZE, context);
    checkSize(context, callExpression, property, FORMIDABLE_DEFAULT_SIZE);
  }
}

function checkMulter(context: Rule.RuleContext, callExpression: estree.CallExpression) {
  if (callExpression.arguments.length === 0) {
    report(context, callExpression.callee);
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

  const limitsPropertyValue = getProperty(multerOptions, LIMITS_OPTION, context)?.value;
  if (limitsPropertyValue && limitsPropertyValue.type === 'ObjectExpression') {
    const fileSizeProperty = getProperty(limitsPropertyValue, FILE_SIZE_OPTION, context);
    checkSize(context, callExpression, fileSizeProperty);
  }

  if (!limitsPropertyValue) {
    report(context, callExpression.callee);
  }
}

function checkBodyParser(context: Rule.RuleContext, callExpression: estree.CallExpression) {
  if (callExpression.arguments.length === 0) {
    checkSize(context, callExpression, undefined, BODY_PARSER_DEFAULT_SIZE, true);
    return;
  }
  const options = getValueOfExpression(context, callExpression.arguments[0], 'ObjectExpression');

  if (!options) {
    return;
  }

  const limitsProperty = getProperty(options, LIMITS_OPTION, context);
  checkSize(context, callExpression, limitsProperty, BODY_PARSER_DEFAULT_SIZE, true);
}

function checkSize(
  context: Rule.RuleContext,
  callExpr: estree.CallExpression,
  property?: estree.Property | null,
  defaultLimit?: number,
  useStandardSizeLimit = false,
) {
  if (property) {
    const maxFileSizeValue = getSizeValue(context, property.value);
    if (maxFileSizeValue) {
      report(context, property, maxFileSizeValue, useStandardSizeLimit);
    }
  } else {
    report(context, callExpr, defaultLimit, useStandardSizeLimit);
  }
}

function visitAssignment(context: Rule.RuleContext, assignment: estree.AssignmentExpression) {
  const variableProperty = getVariablePropertyFromAssignment(context, assignment);
  if (!variableProperty) {
    return;
  }

  const { objectVariable, property } = variableProperty;

  const formOptions = formidableObjects.get(objectVariable);
  if (formOptions && property === MAX_FILE_SIZE) {
    const rhsValue = getSizeValue(context, assignment.right);
    if (rhsValue !== undefined) {
      formOptions.maxFileSize = rhsValue;
      formOptions.nodeToReport = assignment;
    } else {
      formidableObjects.delete(objectVariable);
    }
  }
}

function getSizeValue(context: Rule.RuleContext, node: estree.Node): number | undefined {
  const literal = getValueOfExpression(context, node, 'Literal');
  if (literal) {
    if (typeof literal.value === 'number') {
      return literal.value;
    } else if (typeof literal.value === 'string') {
      return parse(literal.value);
    }
  }
  return undefined;
}

function report(
  context: Rule.RuleContext,
  nodeToReport: estree.Node,
  size?: number,
  useStandardSizeLimit = false,
) {
  const { fileUploadSizeLimit, standardSizeLimit } = {
    ...DEFAULT_OPTIONS,
    ...(context.options as FromSchema<typeof schema>)[0],
  };
  const limitToCompare = useStandardSizeLimit ? standardSizeLimit : fileUploadSizeLimit;
  if (!size || size > limitToCompare) {
    context.report({
      messageId: 'safeLimit',
      node: nodeToReport,
    });
  }
}
