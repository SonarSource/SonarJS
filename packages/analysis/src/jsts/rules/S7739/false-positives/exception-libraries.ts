/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { getFullyQualifiedName } from '../../helpers/module.js';
import { getDependenciesSanitizePaths } from '../../helpers/dependency-manifests/dependencies.js';
import { collectPropertyNames, getAncestorsWithParent } from '../helpers.js';

/**
 * Validation libraries like Yup and Joi intentionally define a `.then()` method
 * on their schema objects to allow chaining validations. This is a legitimate
 * use case that should not trigger the no-thenable rule.
 */
const EXCEPTION_LIBRARIES = ['yup', 'joi'];

// Known packages that re-export a validation library, as 'package.lib' prefixes.
// Narrows the interior-segment FQN check to trusted re-exporters only, avoiding
// false negatives for unrelated packages that happen to export a member named 'yup' or 'joi'.
const TRUSTED_REEXPORT_LIB_PREFIXES = ['strapi-utils.yup', '@strapi/utils.yup'];

/**
 * Checks if a node is inside a call expression from one of the exception libraries.
 * Uses two detection strategies:
 * 1. FQN check on ancestor CallExpressions — runs before the dependency gate so it also matches
 *    libs imported via trusted re-exporting packages (e.g. `const { yup } = require('strapi-utils')`
 *    produces FQN `strapi-utils.yup.mixed.when`, matched by TRUSTED_REEXPORT_LIB_PREFIXES).
 * 2. Conditional validation config pattern ({is, then}) when a validation library is a dependency
 *    — fallback for cases where the FQN cannot be resolved.
 */
export function isInsideExceptionLibraryCall(context: Rule.RuleContext, node: Node): boolean {
  const ancestors = context.sourceCode.getAncestors(node);

  for (const ancestor of ancestors) {
    if (ancestor.type === 'CallExpression') {
      const fqn = getFullyQualifiedName(context, ancestor);
      if (
        fqn &&
        EXCEPTION_LIBRARIES.some(
          lib =>
            fqn === lib ||
            fqn.startsWith(`${lib}.`) ||
            TRUSTED_REEXPORT_LIB_PREFIXES.some(
              prefix => fqn === prefix || fqn.startsWith(`${prefix}.`),
            ),
        )
      ) {
        return true;
      }
    }
  }

  const dependencies = getDependenciesSanitizePaths(context);
  if (!EXCEPTION_LIBRARIES.some(lib => dependencies.has(lib))) {
    return false;
  }

  return isConditionalValidationConfig(node);
}

/**
 * Checks if 'then' is inside an object that also has an 'is' property,
 * indicating a conditional validation config pattern (e.g., {is: ..., then: ...}).
 * This pattern is used by validation libraries like Yup and Joi in their
 * .when() and .conditional() methods.
 */
function isConditionalValidationConfig(node: Node): boolean {
  const ancestors = getAncestorsWithParent(node);
  const objectExpr = ancestors.find(a => a.type === 'ObjectExpression');
  if (objectExpr?.type !== 'ObjectExpression') {
    return false;
  }
  const propertyNames = collectPropertyNames(objectExpr);
  return propertyNames.has('then') && propertyNames.has('is');
}
