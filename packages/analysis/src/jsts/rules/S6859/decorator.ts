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
// https://sonarsource.github.io/rspec/#/rspec/S6859/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import * as meta from './generated-meta.js';

const buildToolRootAliases = new Set(['@', '$', '#']);

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if (!('node' in reportDescriptor)) {
        context.report(reportDescriptor);
        return;
      }

      const node = reportDescriptor.node;
      if (node?.type !== 'Literal') {
        context.report(reportDescriptor);
        return;
      }

      if (isBuildToolRootAlias(node)) {
        return;
      }

      context.report(reportDescriptor);
    },
  );
}

function isBuildToolRootAlias(node: estree.Literal): boolean {
  const importPath = node.value;
  if (typeof importPath !== 'string' || !importPath.startsWith('/')) {
    return false;
  }

  const [firstSegment, secondSegment] = importPath.slice(1).split('/');
  if (secondSegment === undefined) {
    return false;
  }

  return buildToolRootAliases.has(firstSegment);
}
