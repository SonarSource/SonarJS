/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import path from 'path';
import { EmbeddedJS, parseYaml, YamlVisitorPredicate } from 'parsing/yaml';
import { AnalysisError, AnalysisErrorCode } from 'services/analysis';


describe('parseYaml', () => {
  it('should return embedded JavaScript', () => {
    const filePath = path.join(__dirname, 'fixtures', 'parse', 'embedded.yaml');
    const predicate = (_key: any, node: any, _ancestors: any) => node.key.value === 'embedded';
    const [embedded] = parseYaml(predicate, filePath) as EmbeddedJS[];
    expect(embedded).toEqual(
      expect.objectContaining({
        code: 'f(x)',
        line: 2,
        column: 13,
        offset: 17,
        lineStarts: [0, 5, 22, 27, 44],
        text: 'foo:\n  embedded: f(x)\nbar:\n  embbeded: g(y)\n',
      }),
    );
  });

  it('should ignore Helm template directives files', () => {
    const defaultPredicate = (_a, _b, _c) => true;
    const filePath = path.join(__dirname, 'fixtures/parse/helm-directives.yaml');
    const error = parseYaml(defaultPredicate, filePath);
    expect(error).toEqual({
      code: AnalysisErrorCode.UnsupportedYaml,
      line: 3,
      message: 'Unsupported YAML code'
    });
  });

  it('should return parsing errors', () => {
    const filePath = path.join(__dirname, 'fixtures', 'parse', 'error.yaml');
    const predicate = (() => false) as YamlVisitorPredicate;
    const error = parseYaml(predicate, filePath) as AnalysisError;
    expect(error).toEqual({
      code: AnalysisErrorCode.Parsing,
      line: 2,
      message: 'Missing closing "quote',
    });
  });
});
