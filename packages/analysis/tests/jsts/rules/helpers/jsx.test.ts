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
import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import { someRenderedJsxDescendant } from '../../../../src/jsts/rules/helpers/jsx.js';
import { NoTypeCheckingRuleTester } from '../../tools/testers/rule-tester.js';

const renderedDescendantRule: Rule.RuleModule = {
  meta: {
    messages: {
      renderedDescendant: 'The container has a rendered target descendant.',
    },
  },
  create(context) {
    return {
      JSXElement(node) {
        const element = node as unknown as TSESTree.JSXElement;
        if (
          elementName(element) === 'Container' &&
          someRenderedJsxDescendant(
            element,
            descendant => elementName(descendant) === 'Target',
            descendant => elementName(descendant) === 'Boundary',
          )
        ) {
          context.report({ node, messageId: 'renderedDescendant' });
        }
      },
    };
  },
};

function elementName(element: TSESTree.JSXElement): string | null {
  const { name } = element.openingElement;
  return name.type === 'JSXIdentifier' ? name.name : null;
}

const ruleTester = new NoTypeCheckingRuleTester();

ruleTester.run('someRenderedJsxDescendant', renderedDescendantRule, {
  valid: [
    { code: `<Container renderTarget={() => <Target />} />` },
    { code: `<Container><Widget renderTarget={() => <Target />} /></Container>` },
    { code: `<Container>{() => <Target />}</Container>` },
    { code: `<Container>{items.forEach(item => <Target key={item} />)}</Container>` },
    { code: `<Container>{items['map'](item => <Target key={item} />)}</Container>` },
    { code: `<Container><Boundary><Target /></Boundary></Container>` },
  ],
  invalid: [
    { code: `<Container><Target /></Container>`, errors: [{ messageId: 'renderedDescendant' }] },
    {
      code: `<Container><><Target /></></Container>`,
      errors: [{ messageId: 'renderedDescendant' }],
    },
    {
      code: `<Container>{condition && <Target />}</Container>`,
      errors: [{ messageId: 'renderedDescendant' }],
    },
    {
      code: `<Container>{condition ? <Target /> : null}</Container>`,
      errors: [{ messageId: 'renderedDescendant' }],
    },
    {
      code: `<Container>{[<Target key="target" />]}</Container>`,
      errors: [{ messageId: 'renderedDescendant' }],
    },
    {
      code: `<Container>{items.map(item => <Target key={item} />)}</Container>`,
      errors: [{ messageId: 'renderedDescendant' }],
    },
    {
      code: `<Container>{items.flatMap(item => { if (item) return <Target key={item} />; return []; })}</Container>`,
      errors: [{ messageId: 'renderedDescendant' }],
    },
    {
      code: `<Container>{(<Target /> as JSX.Element)}</Container>`,
      errors: [{ messageId: 'renderedDescendant' }],
    },
  ],
});
