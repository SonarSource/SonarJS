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
import type { TSESTree } from '@typescript-eslint/utils';
import type { AST } from 'vue-eslint-parser';
import ts from 'typescript';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    ...rule,
    meta: generateMeta(meta, rule.meta),
    create(context) {
      const sourceCode = context.sourceCode;
      const services = sourceCode.parserServices;
      const document: AST.VDocumentFragment | undefined = services.getDocumentFragment?.();
      const names = new Set(
        document?.children.flatMap(child =>
          child.type === 'VElement' && child.name === 'script'
            ? child.variables.filter(variable => variable.kind === 'generic').map(v => v.id.name)
            : [],
        ),
      );
      if (!names.size || !isRequiredParserServices(services)) {
        return rule.create(context);
      }

      // Vue removes its constraint aliases from ESTree. Distinguish those aliases
      // from real script declarations, including local types with the same name.
      const realAliases = new Set<ts.Node>();
      visitESTree(sourceCode.ast as unknown as TSESTree.Node, sourceCode, node => {
        if (node.type === 'TSTypeAliasDeclaration') {
          realAliases.add(services.esTreeNodeToTSNodeMap.get(node));
        }
      });
      const sourceFile = services.program.getSourceFile(context.filename)!;
      const checker = services.program.getTypeChecker();
      const genericAliases = new Set<ts.Symbol>();
      function collect(node: ts.Node) {
        if (
          ts.isTypeAliasDeclaration(node) &&
          names.has(node.name.text) &&
          !realAliases.has(node)
        ) {
          const symbol = checker.getSymbolAtLocation(node.name);
          if (symbol) genericAliases.add(symbol);
        }
        ts.forEachChild(node, collect);
      }
      collect(sourceFile);

      function dependsOnGeneric(node: ts.Node, seen = new Set<ts.Node>()): boolean {
        if (seen.has(node)) return false;
        seen.add(node);
        const symbol = ts.isIdentifier(node) ? checker.getSymbolAtLocation(node) : undefined;
        if (symbol && genericAliases.has(symbol)) return true;
        if (localTypeDependencies(symbol).some(type => dependsOnGeneric(type, seen))) return true;
        return !!ts.forEachChild(node, child => dependsOnGeneric(child, seen) || undefined);
      }

      function localTypeDependencies(symbol?: ts.Symbol): ts.Node[] {
        return (symbol?.declarations ?? [])
          .filter(declaration => declaration.getSourceFile() === sourceFile)
          .flatMap<ts.Node>(declaration => {
            if (ts.isTypeAliasDeclaration(declaration)) return [declaration];
            if (
              ts.isFunctionLike(declaration) ||
              ts.isClassLike(declaration) ||
              ts.isInterfaceDeclaration(declaration)
            ) {
              return declaration.typeParameters?.flatMap(p => (p.default ? [p.default] : [])) ?? [];
            }
            return [];
          });
      }

      return interceptReport(rule, (ctx, report) => {
        if ('node' in report) {
          const argument = report.node as TSESTree.Node;
          // Check both the argument and its target's defaults. Either can depend
          // on a Vue generic whose constraint is not its actual instantiated type.
          const instantiation = services.esTreeNodeToTSNodeMap.get(argument.parent!);
          const index =
            (argument.parent as TSESTree.TSTypeParameterInstantiation).params.length - 1;
          if (
            dependsOnGeneric(services.esTreeNodeToTSNodeMap.get(argument)) ||
            getDefaults(instantiation, index, checker).some(type => dependsOnGeneric(type))
          )
            return;
        }
        ctx.report(report);
      }).create(context);
    },
  };
}

function getDefaults(node: ts.Node, index: number, checker: ts.TypeChecker): ts.TypeNode[] {
  if (ts.isCallLikeExpression(node)) {
    const parameter = checker.getResolvedSignature(node)?.declaration?.typeParameters?.[index];
    if (parameter && ts.isTypeParameterDeclaration(parameter) && parameter.default) {
      return [parameter.default];
    }
  }
  let target: ts.Node | undefined;
  if (ts.isTypeReferenceNode(node)) {
    target = node.typeName;
  } else if (ts.isExpressionWithTypeArguments(node) || ts.isNewExpression(node)) {
    target = node.expression;
  }
  if (!target) return [];
  let symbol = checker.getSymbolAtLocation(target);
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  return (symbol?.declarations ?? []).flatMap(declaration => {
    if (
      ts.isTypeAliasDeclaration(declaration) ||
      ts.isClassLike(declaration) ||
      ts.isInterfaceDeclaration(declaration)
    ) {
      const type = declaration.typeParameters?.[index]?.default;
      return type ? [type] : [];
    }
    return [];
  });
}

function visitESTree(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  visit: (node: TSESTree.Node) => void,
) {
  visit(node);
  for (const key of sourceCode.visitorKeys[node.type] ?? []) {
    const value = (node as unknown as Record<string, TSESTree.Node | TSESTree.Node[]>)[key];
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child) visitESTree(child, sourceCode, visit);
    }
  }
}
