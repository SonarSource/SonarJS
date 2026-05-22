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
import type estree from 'estree';
import { RuleTester } from '../../../tools/testers/rule-tester.js';
import { isRequiredParserServices } from '../../../../../src/jsts/rules/helpers/parser-services.js';
import { getComponentIdentifier } from '../../../../../src/jsts/rules/helpers/react/component-analysis.js';
import { findComponentOwnersByType } from '../../../../../src/jsts/rules/helpers/react/type-ownership.js';

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

const typeOwnershipRule: Rule.RuleModule = {
  meta: {
    messages: {},
  },
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      throw new Error('Expected required parser services');
    }
    let sawRelayProperty = false;
    let sawPageWrapperProps = false;
    let sawWrappedProps = false;

    const assertOwners = (node: estree.Node, expectedOwners: string[]) => {
      const owners = findComponentOwnersByType(
        context.sourceCode.getAncestors(node),
        context,
        context.sourceCode.visitorKeys,
      )
        .map(componentNode => getComponentIdentifier(componentNode)?.name)
        .filter((name): name is string => name !== undefined)
        .sort();

      assert.deepStrictEqual(owners, [...expectedOwners].sort());
    };

    return {
      TSPropertySignature(node) {
        if (node.key.type === 'Identifier' && node.key.name === 'relay') {
          sawRelayProperty = true;
          assertOwners(node.key, ['SavedSearchesList', 'SavedSearchesListWrapper']);
        }
      },
      TSInterfaceDeclaration(node) {
        if (node.id.name === 'PageWrapperProps') {
          sawPageWrapperProps = true;
          assertOwners(node.id, ['InnerPageWrapper', 'PageWrapper']);
        }
        if (node.id.name === 'WrappedProps') {
          sawWrappedProps = true;
          assertOwners(node.id, ['Wrapped']);
        }
      },
      'Program:exit'() {
        assert.equal(sawRelayProperty, true, 'Expected to visit SharedProps.relay');
        assert.equal(sawPageWrapperProps, true, 'Expected to visit PageWrapperProps');
        assert.equal(sawWrappedProps, true, 'Expected to visit WrappedProps');
      },
    };
  },
};

ruleTester.run('type-ownership', typeOwnershipRule, {
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
}

interface SharedProps {
  relay: string;
}

interface ChildProps extends SharedProps {
  title: string;
}

const SavedSearchesList: React.FC<ChildProps> = props => props.title;
const SavedSearchesListWrapper: React.FC<SharedProps> = props => props.relay;

interface PageWrapperProps {
  moduleName: string;
  viewProps: { isVisible: boolean };
}

const InnerPageWrapper: React.FC<PageWrapperProps> = ({ viewProps }) => {
  return <div>{String(viewProps.isVisible)}</div>;
};

class PageWrapper extends React.Component<PageWrapperProps> {
  render() {
    return <InnerPageWrapper {...this.props} />;
  }
}

interface WrappedProps {
  label: string;
}

const Wrapped = React.memo((props: WrappedProps) => props.label);
`,
    },
  ],
  invalid: [],
});
