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
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { isVendorFile } from '../helpers/vendor-file-pattern.js';
import type estree from 'estree';
import * as meta from './generated-meta.js';

const MIN_VAR_DECLARATIONS = 3;
const MIN_VAR_RATIO = 0.5;

type VariableDeclarationListener = (node: estree.Node) => void;
type ProgramExitListener = NonNullable<Rule.RuleListener['Program:exit']>;
type ProgramNode = Parameters<ProgramExitListener>[0];
type VariableDeclarationNode = estree.VariableDeclaration & { declare?: boolean };

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    ...rule,
    meta: generateMeta(meta, rule.meta),
    create(context) {
      if (isVendorFile(context.physicalFilename)) {
        return {};
      }

      let totalDeclarations = 0;
      let varDeclarations = 0;
      const interceptedReports: Rule.ReportDescriptor[] = [];

      const interceptedRule = interceptReport(rule, (_context, reportDescriptor) => {
        const transformedReport = transformReportDescriptor(context, reportDescriptor);
        if (transformedReport) {
          interceptedReports.push(transformedReport);
        }
      });
      const listener = interceptedRule.create(context);
      const onVariableDeclaration = listener.VariableDeclaration as
        VariableDeclarationListener | undefined;
      const onProgramExit = listener['Program:exit'] as ProgramExitListener | undefined;

      return {
        ...listener,
        VariableDeclaration(node: estree.Node) {
          const declaration = node as VariableDeclarationNode;
          if (!declaration.declare) {
            totalDeclarations++;
            if (declaration.kind === 'var') {
              varDeclarations++;
            }
          }

          if (typeof onVariableDeclaration === 'function') {
            onVariableDeclaration(node);
          }
        },
        'Program:exit'(node: ProgramNode) {
          if (typeof onProgramExit === 'function') {
            onProgramExit(node);
          }

          if (!shouldSuppressVarHeavyFile(totalDeclarations, varDeclarations)) {
            for (const reportDescriptor of interceptedReports) {
              context.report(reportDescriptor);
            }
          }

          interceptedReports.length = 0;
          totalDeclarations = 0;
          varDeclarations = 0;
        },
      };
    },
  };
}

/**
 * Returns whether S3504 should be suppressed for files that intentionally favor var.
 * @param totalDeclarations the number of runtime variable declarations in the file
 * @param varDeclarations the number of runtime var declarations in the file
 * @return true when var is the dominant runtime declaration style and would create noisy reporting
 */
function shouldSuppressVarHeavyFile(totalDeclarations: number, varDeclarations: number): boolean {
  return (
    totalDeclarations > 0 &&
    varDeclarations >= MIN_VAR_DECLARATIONS &&
    varDeclarations / totalDeclarations > MIN_VAR_RATIO
  );
}

/**
 * Converts ESLint core no-var reports to Sonar's var-keyword location.
 * @param context the ESLint rule context
 * @param reportDescriptor the upstream report descriptor
 * @return a transformed report descriptor, or undefined when the issue should be skipped
 */
function transformReportDescriptor(
  context: Rule.RuleContext,
  reportDescriptor: Rule.ReportDescriptor,
) {
  if (!('node' in reportDescriptor)) {
    return undefined;
  }

  const { node, ...rest } = reportDescriptor;
  const varDecl = node as VariableDeclarationNode;

  // Skip TypeScript ambient declarations (declare var)
  if (varDecl.declare) {
    return undefined;
  }

  const {
    declarations: [firstDecl, ..._],
  } = varDecl;

  const varToken = context.sourceCode.getTokenBefore(firstDecl.id);
  const identifierEnd = firstDecl.id.loc!.end;
  if (varToken == null) {
    // impossible
    return undefined;
  }

  return {
    loc: {
      start: varToken.loc.start,
      end: identifierEnd,
    },
    ...rest,
  };
}
