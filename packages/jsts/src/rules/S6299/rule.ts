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
// https://sonarsource.github.io/rspec/#/rspec/S6299/javascript

import type estree from 'estree';
import type { Rule } from 'eslint';
import type { AST } from 'vue-eslint-parser';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      safeVueBypassing: 'Make sure bypassing Vue built-in sanitization is safe here.',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;

    const ruleListener: Rule.RuleListener = {
      ["JSXAttribute[name.name='domPropsInnerHTML']," +
        "Property[key.name='domProps'] > ObjectExpression.value > Property[key.name='innerHTML']"](
        node: estree.Node,
      ) {
        context.report({ node, messageId: 'safeVueBypassing' });
      },
      [`${attrsHref('createElement')},${attrsHref('h')}`](node: estree.Node) {
        context.report({ node, messageId: 'safeVueBypassing' });
      },
    };

    // @ts-ignore
    if (services.defineTemplateBodyVisitor) {
      // analyze <template> in .vue file
      const templateBodyVisitor = context.sourceCode.parserServices.defineTemplateBodyVisitor({
        ["VAttribute[directive=true][key.name.name='html']," +
          "VAttribute[directive=true][key.argument.name='href']"](node: AST.VAttribute) {
          context.report({
            loc: node.loc,
            messageId: 'safeVueBypassing',
          });
        },
      });
      Object.assign(ruleListener, templateBodyVisitor);
    }

    return ruleListener;
  },
};

function attrsHref(calleeName: string) {
  // select call expression with given name where second argument is object expression like { attrs: { href: 'bla' } }
  return `CallExpression[callee.name='${calleeName}'] ObjectExpression.arguments:nth-child(2) > Property[key.name='attrs'] > ObjectExpression.value > Property[key.name='href']`;
}
