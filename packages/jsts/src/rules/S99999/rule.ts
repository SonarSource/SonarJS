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
import { join, dirname } from 'path';
import { translateMethod, translateTopLevel } from '../../dbd/frontend/ir-generator';
import { FunctionInfo } from '../../dbd/ir-gen/ir_pb';
import { mkdirpSync } from 'mkdirp';
import { functionInto2Text } from '../../dbd/helpers';

let i = 0;

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      message: 'Add an initial value to this "reduce()" call.',
    },
  },
  create(context: Rule.RuleContext) {
    const print = context.settings?.dbd?.print;
    const outputDir = print ? '' : context.settings?.dbd?.outDir ?? join(__dirname, 'ir', 'python');
    const root = context.settings?.dbd?.root || dirname(context.filename);
    const irts: string[] = [];
    if (!print) {
      mkdirpSync(outputDir);
    }

    let functionNo = 0;
    const saveResults = (
      result: FunctionInfo,
      methods: string[],
      methodVariables: string[],
      hasOfCall: boolean,
      functionIdentifier: string,
    ) => {
      const irt = functionInto2Text(result);
      if (print) {
        console.log(irt);
        return;
      }
      const content = JSON.stringify(result.toJson({ emitDefaultValues: true }), null, 2);
      const fileNameBase = join(outputDir, `ir${i}_${functionIdentifier}`);
      let metadataContent = [...methods].join('\n');
      if (hasOfCall) {
        metadataContent += `\n****\nhasHOFCalls\n`;
      }
      if (methodVariables.length > 0) {
        metadataContent += `\n----\n` + methodVariables.join('\n');
      }
      writeFileSync(`${fileNameBase}.json`, content, { flag: 'w' });
      writeFileSync(`${fileNameBase}.metadata`, metadataContent, { flag: 'w' });
      writeFileSync(`${fileNameBase}.ir`, result.toBinary(), { flag: 'w' });
      irts.push(irt);
    };

    return {
      Program(node: estree.Node) {
        try {
          const result = translateTopLevel(context.filename, root, node as TSESTree.Program);
          if (result) {
            saveResults(...result, 'main');
          }
        } catch (err) {
          console.log('Error processing top level:', node, err);
        }
      },
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node: estree.Node) {
        try {
          const result = translateMethod(
            context.filename,
            root,
            node as TSESTree.FunctionDeclaration,
          );
          saveResults(...result, String(functionNo));
        } catch (err) {
          console.log('Error processing node:', node, err);
        }
        functionNo++;
      },
      'Program:exit'() {
        if (!print) {
          writeFileSync(join(outputDir, `${i}.irt`), irts.join(''), { flag: 'w' });
        }
        i++;
      },
    };
  },
};