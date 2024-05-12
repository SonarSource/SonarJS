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
// https://sonarsource.github.io/rspec/#/rspec/S99999/javascript

import * as estree from 'estree';
import { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/utils';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { translateToIR } from '../../dbd/frontend/ir-generator';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      message: 'Add an initial value to this "reduce()" call.',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node: estree.Node) {
        const result = translateToIR(context, node as TSESTree.FunctionDeclaration);
        if (result) {
          const content = JSON.stringify(result.toJson({ emitDefaultValues: true }), null, '\t');
          const fileName = join(__dirname, `${context.settings.name}`);
          writeFileSync(`${fileName}.json`, content, { flag: 'w' });
          writeFileSync(`${fileName}.buf`, result.toBinary(), { flag: 'w' });
        } else {
          console.log("Couldn't parse");
        }
      },
    };
  },
};
