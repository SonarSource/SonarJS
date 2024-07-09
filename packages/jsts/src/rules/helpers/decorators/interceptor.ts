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
import { Rule } from 'eslint';
import * as estree from 'estree';

const NUM_ARGS_NODE_MESSAGE = 2;

export type ReportOverrider = (
  context: Rule.RuleContext,
  reportDescriptor: Rule.ReportDescriptor,
) => void;
export type ContextOverrider = (
  context: Rule.RuleContext,
  onReport: ReportOverrider,
) => Rule.RuleContext;

/**
 * Modifies the behavior of `context.report(descriptor)` for a given rule.
 *
 * Useful for performing additional checks before reporting an issue.
 *
 * @param rule the original rule
 * @param onReport replacement for `context.report(descr)`
 *                 invocations used inside of the rule
 * @param contextOverrider optional function to change the default context overridding mechanism
 */
export function interceptReport(
  rule: Rule.RuleModule,
  onReport: ReportOverrider,
  contextOverrider?: ContextOverrider,
): Rule.RuleModule {
  return {
    // meta should be defined only when it's defined on original rule, otherwise RuleTester will fail
    ...(!!rule.meta && { meta: rule.meta }),
    create(originalContext: Rule.RuleContext) {
      let interceptingContext: Rule.RuleContext;
      if (contextOverrider == null) {
        interceptingContext = {
          id: originalContext.id,
          options: originalContext.options,
          settings: originalContext.settings,
          parserPath: originalContext.parserPath,
          parserOptions: originalContext.parserOptions,
          parserServices: originalContext.sourceCode.parserServices,
          sourceCode: originalContext.sourceCode,
          cwd: originalContext.cwd,
          filename: originalContext.filename,
          physicalFilename: originalContext.physicalFilename,
          languageOptions: originalContext.languageOptions,

          getCwd(): string {
            return originalContext.cwd;
          },

          getPhysicalFilename(): string {
            return originalContext.physicalFilename;
          },

          getAncestors() {
            return originalContext.getAncestors();
          },

          getDeclaredVariables(node: estree.Node) {
            return originalContext.getDeclaredVariables(node);
          },

          getFilename() {
            return originalContext.filename;
          },

          getScope() {
            return originalContext.getScope();
          },

          getSourceCode() {
            return originalContext.sourceCode;
          },

          markVariableAsUsed(name: string) {
            return originalContext.markVariableAsUsed(name);
          },

          report(...args: any[]): void {
            let descr: Rule.ReportDescriptor | undefined = undefined;
            if (args.length === 1) {
              descr = args[0] as Rule.ReportDescriptor;
            } else if (args.length === NUM_ARGS_NODE_MESSAGE && typeof args[1] === 'string') {
              // not declared in the `.d.ts`, but used in practice by rules written in JS
              descr = {
                node: args[0] as estree.Node,
                message: args[1],
              };
            }
            if (descr) {
              onReport(originalContext, descr);
            }
          },
        };
      } else {
        interceptingContext = contextOverrider(originalContext, onReport);
      }
      return rule.create(interceptingContext);
    },
  };
}

// interceptReport() by default doesn't work with the React plugin
// as the rules fail to find the context getFirstTokens() function.
export function interceptReportForReact(rule: Rule.RuleModule, onReport: ReportOverrider) {
  return interceptReport(rule, onReport, contextOverriderForReact);
}

function contextOverriderForReact(
  context: Rule.RuleContext,
  onReport: (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) => void,
): Rule.RuleContext {
  const overriddenReportContext = {
    report(reportDescriptor: Rule.ReportDescriptor) {
      onReport(context, reportDescriptor);
    },
  };

  Object.setPrototypeOf(overriddenReportContext, context);

  return overriddenReportContext as Rule.RuleContext;
}
