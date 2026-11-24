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
let result;
exports.getResult = () => result;
exports.rules = [
  {
    ruleId: 'host-compiler-probe',
    ruleModule: {
      meta: { schema: [] },
      create(context) {
        const { program, esTreeNodeToTSNodeMap } = context.sourceCode.parserServices;
        const { typescriptSyntax } = context.settings.sonarjs;
        result = { program, sonarjsSettings: context.settings.sonarjs };
        if (!program) return {};
        return {
          CallExpression(estreeNode) {
            const node = esTreeNodeToTSNodeMap.get(estreeNode);
            result.callIsConstruct = typescriptSyntax.isNewExpression(node);
            if (typescriptSyntax.isCallExpression(node)) {
              result.declaration = program.getTypeChecker().getResolvedSignature(node)?.getDeclaration();
            }
          },
          NewExpression(estreeNode) {
            result.newIsConstruct = typescriptSyntax.isNewExpression(esTreeNodeToTSNodeMap.get(estreeNode));
          },
        };
      },
    },
  },
];
