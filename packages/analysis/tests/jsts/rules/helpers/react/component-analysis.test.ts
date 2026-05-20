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
import path from 'node:path';
import assert from 'node:assert/strict';
import type { Rule } from 'eslint';
import { RuleTester } from '../../../tools/testers/rule-tester.js';
import { isRequiredParserServices } from '../../../../../src/jsts/rules/helpers/parser-services.js';
import {
  collectComponents,
  createComponentAnalysis,
} from '../../../../../src/jsts/rules/helpers/react/component-analysis.js';

const fixtureDirectory = path.join(
  import.meta.dirname,
  '../../../../../src/jsts/rules/S6767/fixtures',
);
const fixtureFilePath = path.join(fixtureDirectory, 'placeholder.tsx');

const ruleTester = new RuleTester({
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: fixtureDirectory,
  },
});

const componentAnalysisRule: Rule.RuleModule = {
  meta: {
    messages: {},
  },
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      throw new Error('Expected required parser services');
    }

    return {
      Program(node) {
        const summary = collectComponents(node, context.sourceCode.visitorKeys).map(component => {
          const analysis = createComponentAnalysis(component, services);
          return {
            name: component.componentIdentifier?.name ?? '<anonymous>',
            memberCount: analysis.memberPropsTypeCandidates.length,
            typeCount: analysis.enclosingTypePropsTypeCandidates.length,
          };
        });

        assert.deepStrictEqual(summary, [
          { name: 'helper', memberCount: 0, typeCount: 0 },
          { name: 'Button', memberCount: 1, typeCount: 1 },
          { name: 'MemoButton', memberCount: 1, typeCount: 1 },
          { name: 'ForwardedButton', memberCount: 1, typeCount: 1 },
          { name: '<anonymous>', memberCount: 1, typeCount: 1 },
          { name: 'Panel', memberCount: 1, typeCount: 1 },
        ]);
      },
    };
  },
};

ruleTester.run('component-analysis', componentAnalysisRule, {
  valid: [
    {
      filename: fixtureFilePath,
      code: `
declare namespace React {
  interface Component<P> {
    props: P;
  }
  const Component: new <P>() => Component<P>;
  type FC<P> = (props: P) => unknown;
  function memo<T>(component: T): T;
  function forwardRef<T>(render: T): T;
}

type Props = { label: string; };
function helper(props: Props) { return props.label; }
const Button: React.FC<Props> = props => props.label;
const MemoButton = React.memo((props: Props) => props.label);
const ForwardedButton = React.forwardRef((props: Props, ref: unknown) => props.label);
export default React.memo((props: Props) => props.label);
class Panel extends React.Component<Props> { render() { return <div>{this.props.label}</div>; } }
`,
    },
  ],
  invalid: [],
});
