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

import { Rule } from 'eslint';
import { writeFileSync } from 'fs';
import { mkdirpSync } from 'mkdirp';
import { functionInto2Text } from '../../dbd/helpers';
import { createTranspiler, serialize } from '../../dbd';
import { dirname, join, relative } from 'path';
import { TSESTree } from '@typescript-eslint/utils';
import { FunctionInfo } from '../../dbd/ir-gen/ir_pb';

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
    const root = context.settings?.dbd?.root?.replace(/\/+$/, '') || dirname(context.filename);
    const relativeFileName = relative(root, context.filename);
    const irts: string[] = [];
    if (!print) {
      mkdirpSync(outputDir);
    }
    const { ast } = context.sourceCode;
    const transpile = createTranspiler([]);
    const functionInfos = transpile(ast as TSESTree.Program, relativeFileName);

    const saveResults = (
      result: FunctionInfo,
      methods: string[],
      methodVariables: string[],
      hasOfCall: boolean,
      functionIdentifier: string,
      data: Uint8Array,
    ) => {
      const irt = functionInto2Text(result);
      if (print) {
        console.log(irt);
        return;
      }
      const content = JSON.stringify(result, null, 2);
      const fileNameBase = join(outputDir, `ir${i}_${functionIdentifier}`);
      let metadataContent = [...methods].join('\n');
      if (hasOfCall) {
        metadataContent += `\n****\nhasHOFCalls\n`;
      }
      if (methodVariables.length > 0) {
        metadataContent += `\n----\n` + methodVariables.join('\n');
      }
      console.log(`Writing to file ${fileNameBase}`);
      writeFileSync(`${fileNameBase}.json`, content, { flag: 'w' });
      writeFileSync(`${fileNameBase}.metadata`, metadataContent, { flag: 'w' });
      writeFileSync(`${fileNameBase}.ir`, data, { flag: 'w' });
      irts.push(irt);
    };

    const outputs = serialize(functionInfos, context.filename);

    for (const { name, data, metadata } of outputs) {
      const functionInfo = FunctionInfo.fromBinary(data);
      saveResults(functionInfo, metadata, [], false, name, data);
    }
    if (!print) {
      writeFileSync(join(outputDir, `ir${i}_readable.tir`), irts.join('\n'), { flag: 'w' });
    }
    i++;
    return {};
  },
};
