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
import type { Rule, SourceCode } from 'eslint';
import { generateMeta } from '../helpers/generate-meta.js';
import { childrenOf } from '../helpers/ancestor.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { isVendorFile } from '../helpers/vendor-file-pattern.js';
import type estree from 'estree';
import * as meta from './generated-meta.js';

const MIN_VAR_DECLARATIONS = 3;
const MIN_VAR_RATIO = 0.5;

type VariableDeclarationCounts = {
  totalDeclarations: number;
  varDeclarations: number;
};

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
      create(context) {
        if (
          isVendorFile(context.physicalFilename) ||
          shouldSuppressVarHeavyFile(context.sourceCode)
        ) {
          return {};
        }
        return rule.create(context);
      },
    },
    (context, reportDescriptor) => {
      if ('node' in reportDescriptor) {
        const { node, ...rest } = reportDescriptor;
        const varDecl = node as estree.VariableDeclaration & { declare?: boolean };

        // Skip TypeScript ambient declarations (declare var)
        if (varDecl.declare) {
          return;
        }

        const {
          declarations: [firstDecl, ..._],
        } = varDecl;

        const varToken = context.sourceCode.getTokenBefore(firstDecl.id);
        const identifierEnd = firstDecl.id.loc!.end;
        if (varToken == null) {
          // impossible
          return;
        }
        context.report({
          loc: {
            start: varToken.loc.start,
            end: identifierEnd,
          },
          ...rest,
        });
      }
    },
  );
}

/**
 * Returns whether S3504 should be suppressed for files that intentionally favor var.
 * @param sourceCode the file being analyzed
 * @return true when var is the dominant runtime declaration style and would create noisy reporting
 */
function shouldSuppressVarHeavyFile(sourceCode: SourceCode): boolean {
  const { totalDeclarations, varDeclarations } = countRuntimeVariableDeclarations(sourceCode);
  return (
    totalDeclarations > 0 &&
    varDeclarations >= MIN_VAR_DECLARATIONS &&
    varDeclarations / totalDeclarations > MIN_VAR_RATIO
  );
}

/**
 * Counts runtime variable declarations while ignoring TypeScript ambient declarations.
 * @param sourceCode the file being analyzed
 * @return the total runtime declarations and how many of them use var
 */
function countRuntimeVariableDeclarations(sourceCode: SourceCode): VariableDeclarationCounts {
  const counts: VariableDeclarationCounts = {
    totalDeclarations: 0,
    varDeclarations: 0,
  };
  const nodesToVisit: estree.Node[] = [sourceCode.ast as estree.Node];

  while (nodesToVisit.length > 0) {
    const node = nodesToVisit.pop()!;
    if (node.type === 'VariableDeclaration') {
      const declaration = node as estree.VariableDeclaration & { declare?: boolean };
      if (!declaration.declare) {
        counts.totalDeclarations++;
        if (declaration.kind === 'var') {
          counts.varDeclarations++;
        }
      }
    }
    nodesToVisit.push(...childrenOf(node, sourceCode.visitorKeys));
  }

  return counts;
}
