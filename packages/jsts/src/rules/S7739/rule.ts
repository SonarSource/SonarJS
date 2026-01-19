/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S7739/javascript

import type { Rule } from 'eslint';
import type { CallExpression, Node } from 'estree';
import { rules } from '../external/unicorn.js';
import { generateMeta, getFullyQualifiedName, interceptReport } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const noThenable = rules['no-thenable'];

/**
 * Validation libraries like Yup and Joi intentionally define a `.then()` method
 * on their schema objects to allow chaining validations. This is a legitimate
 * use case that should not trigger the no-thenable rule.
 */
const EXCEPTION_LIBRARIES = ['yup', 'joi'];

/**
 * Checks if a node is inside a call expression from one of the exception libraries
 */
function isInsideExceptionLibraryCall(context: Rule.RuleContext, node: Node): boolean {
  const ancestors = context.sourceCode.getAncestors(node);

  for (const ancestor of ancestors) {
    if (ancestor.type === 'CallExpression') {
      const fqn = getFullyQualifiedName(context, ancestor as CallExpression);
      if (fqn && EXCEPTION_LIBRARIES.some(lib => fqn.startsWith(lib))) {
        return true;
      }
    }
  }

  return false;
}

export const rule: Rule.RuleModule = interceptReport(
  {
    ...noThenable,
    meta: generateMeta(meta, noThenable.meta),
  },
  (context, descriptor) => {
    const node = (descriptor as { node?: Node }).node;
    if (node && isInsideExceptionLibraryCall(context, node)) {
      return; // Skip reporting for code inside Yup/Joi calls
    }
    context.report(descriptor);
  },
);
