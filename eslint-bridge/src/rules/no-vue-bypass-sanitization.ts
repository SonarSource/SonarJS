/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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

import * as estree from 'estree';
import { Rule } from 'eslint';
import { AST } from 'vue-eslint-parser';

const message = `Make sure bypassing Vue built-in sanitization is safe here.`;

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services = context.parserServices;

    function attrsHref(calleeName: string) {
      // select call expression with given name where second argument is object expression like { attrs: { href: 'bla' } }
      return `CallExpression[callee.name='${calleeName}'] ObjectExpression.arguments:nth-child(2) > Property[key.name='attrs'] > ObjectExpression.value > Property[key.name='href']`;
    }

    const ruleListener: Rule.RuleListener = {
      ["JSXAttribute[name.name='domPropsInnerHTML']," +
        "Property[key.name='domProps'] > ObjectExpression.value > Property[key.name='innerHTML']"](
        node: estree.Node,
      ) {
        context.report({ node, message });
      },
      [`${attrsHref('createElement')},${attrsHref('h')}`](node: estree.Node) {
        context.report({ node, message });
      },
    };

    // @ts-ignore
    if (services.defineTemplateBodyVisitor) {
      // analyze <template> in .vue file
      const templateBodyVisitor = context.parserServices.defineTemplateBodyVisitor({
        ["VAttribute[directive=true][key.name.name='html']," +
          "VAttribute[directive=true][key.argument.name='href']"](node: AST.VAttribute) {
          context.report({
            loc: node.loc,
            message,
          });
        },
      });
      Object.assign(ruleListener, templateBodyVisitor);
    }

    return ruleListener;
  },
};
