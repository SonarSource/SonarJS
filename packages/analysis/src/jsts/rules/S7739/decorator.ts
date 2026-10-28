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
// https://sonarsource.github.io/rspec/#/rspec/S7739/javascript

import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { getPropertyName } from '@eslint-community/eslint-utils';
import { getNodeParent } from '../helpers/ancestor.js';
import { isNumberLiteral } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import * as meta from './generated-meta.js';
import {
  isInsideExceptionLibraryCall,
  isIntentionalThenableImplementation,
} from './false-positives/index.js';

/**
 * Suppresses numeric data properties and the established exceptions in ./false-positives.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      const node = (descriptor as { node?: Node }).node;
      if (!node) {
        context.report(descriptor);
        return;
      }

      if (isNumericThenProperty(node)) {
        return;
      }

      // Skip reporting for code inside Yup/Joi calls
      if (isInsideExceptionLibraryCall(context, node)) {
        return;
      }

      // Skip reporting for intentional thenable implementations
      if (isIntentionalThenableImplementation(context, node)) {
        return;
      }

      context.report(descriptor);
    },
  );
}

/**
 * Checks that a numeric `then` property cannot be replaced by a later object property.
 */
function isNumericThenProperty(node: Node): boolean {
  const property = getNodeParent(node);
  if (
    property?.type !== 'Property' ||
    property.key !== node ||
    property.kind !== 'init' ||
    !isNumberLiteral(property.value)
  ) {
    return false;
  }

  const object = getNodeParent(property);
  if (object?.type !== 'ObjectExpression') {
    return false;
  }

  const propertyIndex = object.properties.indexOf(property);
  if (propertyIndex === -1) {
    return false;
  }

  for (let index = propertyIndex + 1; index < object.properties.length; index++) {
    const following = object.properties[index];
    if (following.type !== 'Property' || following.computed) {
      return false;
    }
    const name = getPropertyName(following);
    if (name == null || name === 'then') {
      return false;
    }
  }
  return true;
}
