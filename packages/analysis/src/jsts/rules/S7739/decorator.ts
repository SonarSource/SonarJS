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
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import * as meta from './generated-meta.js';
import {
  isInsideExceptionLibraryCall,
  isIntentionalThenableImplementation,
} from './false-positives/index.js';

/**
 * Decorates the upstream unicorn 'no-thenable' rule so that reports are suppressed for the
 * false-positive patterns tracked in ./false-positives: validation-library conditional
 * configs (Yup/Joi), Promise/Deferred delegation and definitions, prototype extension,
 * sibling then/catch/finally implementations, JSON Schema conditionals, interface shape
 * descriptors, and classes with an explicit thenable contract.
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
