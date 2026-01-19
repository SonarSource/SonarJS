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
// https://sonarsource.github.io/rspec/#/rspec/S6774/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { parse as parseSemver } from 'semver';
import { generateMeta, interceptReport } from '../helpers/index.js';
import { getReactVersion } from '../helpers/package-jsons/dependencies.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the react/prop-types rule to skip components wrapped in React.forwardRef
 * when the project uses React 19+.
 *
 * React 19 deprecated propTypes specifically on forwardRef components
 * (ForwardRefExoticComponent), so flagging missing propTypes on these
 * components is no longer appropriate for React 19+ projects.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      const node = (reportDescriptor as { node?: estree.Node }).node;
      if (!node) {
        context.report(reportDescriptor);
        return;
      }

      // Only skip forwardRef components if using React 19+
      if (isReact19OrLater(context) && isInsideForwardRef(node, context)) {
        return; // Skip reporting for forwardRef components in React 19+
      }

      context.report(reportDescriptor);
    },
  );
}

/**
 * Checks if the project uses React 19 or later.
 */
function isReact19OrLater(context: Rule.RuleContext): boolean {
  const reactVersion = getReactVersion(context);
  if (!reactVersion) {
    return true; // If we can't determine the version, be conservative and don't report
  }
  const version = parseSemver(reactVersion);
  return version !== null && version.major >= 19;
}

/**
 * Checks if a node is inside a React.forwardRef() call.
 */
function isInsideForwardRef(node: estree.Node, context: Rule.RuleContext): boolean {
  const ancestors = context.sourceCode.getAncestors(node);

  for (const ancestor of ancestors) {
    if (ancestor.type === 'CallExpression' && isForwardRefCall(ancestor)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a CallExpression is a React.forwardRef() or forwardRef() call.
 */
function isForwardRefCall(node: estree.CallExpression): boolean {
  const { callee } = node;

  // Direct call: forwardRef(...)
  if (callee.type === 'Identifier' && callee.name === 'forwardRef') {
    return true;
  }

  // Member expression: React.forwardRef(...)
  if (
    callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'forwardRef'
  ) {
    return true;
  }

  return false;
}
