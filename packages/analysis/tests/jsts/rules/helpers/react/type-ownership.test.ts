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
import {
  collectComponentNodes,
  getComponentIdentifier,
} from '../../../../../src/jsts/rules/helpers/react/component-analysis.js';
import {
  findComponentOwnersByType,
  getComponentReportedTypeUsage,
  hasOnlyReactClassNonPropsReportedTypeUsage,
} from '../../../../../src/jsts/rules/helpers/react/type-ownership.js';

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

function getEnclosingInterfaceName(
  sourceCode: Rule.RuleContext['sourceCode'],
  node: estree.Node,
): string | undefined {
  const interfaceDeclaration = sourceCode
    .getAncestors(node)
    .findLast(ancestor => (ancestor as { type?: string }).type === 'TSInterfaceDeclaration');
  return (interfaceDeclaration as { id?: { name?: string } } | undefined)?.id?.name;
}

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
      const owners = findComponentOwnersByType(context.sourceCode.getAncestors(node), context)
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

const typeUsageRule: Rule.RuleModule = {
  meta: {
    messages: {},
  },
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      throw new Error('Expected required parser services');
    }

    let sawAnchorState = false;
    let sawPropsOnly = false;
    let sawStateOnly = false;
    let sawSharedType = false;

    const assertUsage = (
      node: estree.Node,
      expectedUsages: Record<string, 'mixed' | 'non-props' | 'other' | 'props'>,
    ) => {
      const ancestors = context.sourceCode.getAncestors(node);
      const usages = collectComponentNodes(context.sourceCode.ast, context.sourceCode.visitorKeys)
        .map(componentNode => ({
          name: getComponentIdentifier(componentNode)?.name,
          usage: getComponentReportedTypeUsage(componentNode, ancestors, context),
        }))
        .filter(
          (
            componentSummary,
          ): componentSummary is {
            name: string;
            usage: 'mixed' | 'non-props' | 'other' | 'props';
          } => componentSummary.name !== undefined && componentSummary.usage !== 'other',
        )
        .sort((left, right) => left.name.localeCompare(right.name));

      assert.deepStrictEqual(
        usages,
        Object.entries(expectedUsages)
          .map(([name, usage]) => ({ name, usage }))
          .sort((left, right) => left.name.localeCompare(right.name)),
      );
    };

    return {
      TSPropertySignature(node) {
        if (node.key.type !== 'Identifier') {
          return;
        }

        const interfaceName = getEnclosingInterfaceName(context.sourceCode, node.key);

        if (interfaceName === 'AnchorState' && node.key.name === 'activeLink') {
          sawAnchorState = true;
          assertUsage(node.key, { Anchor: 'non-props' });
        }

        if (interfaceName === 'SlotSplitType' && node.key.name === 'propsOnly') {
          sawPropsOnly = true;
          assertUsage(node.key, { SlotSplitOwner: 'props' });
        }

        if (interfaceName === 'SlotSplitType' && node.key.name === 'stateOnly') {
          sawStateOnly = true;
          assertUsage(node.key, { SlotSplitOwner: 'non-props' });
        }

        if (interfaceName === 'SharedType' && node.key.name === 'unused') {
          sawSharedType = true;
          assertUsage(node.key, {
            PropsOwner: 'props',
            StateOwner: 'non-props',
            WrappedPropsOwner: 'mixed',
          });
        }
      },
      'Program:exit'() {
        assert.equal(sawAnchorState, true, 'Expected to visit AnchorState.activeLink');
        assert.equal(sawPropsOnly, true, 'Expected to visit SlotSplitType.propsOnly');
        assert.equal(sawStateOnly, true, 'Expected to visit SlotSplitType.stateOnly');
        assert.equal(sawSharedType, true, 'Expected to visit SharedType.unused');
      },
    };
  },
};

ruleTester.run('type-usage', typeUsageRule, {
  valid: [
    {
      filename: fixtureFilePath,
      code: `
declare const React: any;

interface AnchorState {
  activeLink: null | string;
}
interface AnchorProps {
  href?: string;
}
interface AnchorSnapshot {
  scrollTop: number;
}
class Anchor extends React.Component<AnchorProps, AnchorState, AnchorSnapshot> {
  render() {
    return <a href={this.props.href}>{this.state.activeLink}</a>;
  }
}

interface SlotSplitType {
  propsOnly: string;
  stateOnly: string;
}
class SlotSplitOwner extends React.Component<Pick<SlotSplitType, 'propsOnly'>, Pick<SlotSplitType, 'stateOnly'>> {
  render() {
    return <div>{this.state.stateOnly}</div>;
  }
}

interface SharedType {
  unused: string;
}
interface Snapshot {
  scrollTop: number;
}
class PropsOwner extends React.Component<SharedType> {
  render() {
    return <div />;
  }
}
class StateOwner extends React.Component<{}, SharedType, Snapshot> {
  render() {
    return <div>{this.state.unused}</div>;
  }
}
class WrappedPropsOwner extends React.Component<Readonly<SharedType>, SharedType, Snapshot> {
  render() {
    return <div>{this.state.unused}</div>;
  }
}
`,
    },
  ],
  invalid: [],
});

const nonPropsProofRule: Rule.RuleModule = {
  meta: {
    messages: {},
  },
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      throw new Error('Expected required parser services');
    }

    let sawAnchorState = false;
    let sawSharedType = false;
    let sawSlotSplitType = false;

    const assertNonPropsProof = (node: estree.Node, expected: boolean) => {
      assert.equal(
        hasOnlyReactClassNonPropsReportedTypeUsage(node, context),
        expected,
      );
    };

    return {
      TSPropertySignature(node) {
        if (node.key.type !== 'Identifier') {
          return;
        }

        const interfaceName = getEnclosingInterfaceName(context.sourceCode, node.key);

        if (interfaceName === 'AnchorState' && node.key.name === 'activeLink') {
          sawAnchorState = true;
          assertNonPropsProof(node.key, true);
        }

        if (interfaceName === 'SharedType' && node.key.name === 'unused') {
          sawSharedType = true;
          assertNonPropsProof(node.key, false);
        }
      },
      TSInterfaceDeclaration(node) {
        if (node.id.name === 'SlotSplitType') {
          sawSlotSplitType = true;
          assertNonPropsProof(node.id, false);
        }
      },
      'Program:exit'() {
        assert.equal(sawAnchorState, true, 'Expected to visit AnchorState.activeLink');
        assert.equal(sawSharedType, true, 'Expected to visit SharedType.unused');
        assert.equal(sawSlotSplitType, true, 'Expected to visit SlotSplitType');
      },
    };
  },
};

ruleTester.run('non-props-proof', nonPropsProofRule, {
  valid: [
    {
      filename: fixtureFilePath,
      code: `
declare const React: any;

interface AnchorState {
  activeLink: null | string;
}
interface AnchorProps {
  href?: string;
}
interface AnchorSnapshot {
  scrollTop: number;
}
class Anchor extends React.Component<AnchorProps, AnchorState, AnchorSnapshot> {
  render() {
    return <a href={this.props.href}>{this.state.activeLink}</a>;
  }
}

interface SlotSplitType {
  propsOnly: string;
  stateOnly: string;
}
class SlotSplitOwner extends React.Component<Pick<SlotSplitType, 'propsOnly'>, Pick<SlotSplitType, 'stateOnly'>> {
  render() {
    return <div>{this.state.stateOnly}</div>;
  }
}

interface SharedType {
  unused: string;
}
interface Snapshot {
  scrollTop: number;
}
class PropsOwner extends React.Component<SharedType> {
  render() {
    return <div />;
  }
}
class StateOwner extends React.Component<{}, SharedType, Snapshot> {
  render() {
    return <div>{this.state.unused}</div>;
  }
}
class WrappedPropsOwner extends React.Component<Readonly<SharedType>, SharedType, Snapshot> {
  render() {
    return <div>{this.state.unused}</div>;
  }
}
`,
    },
  ],
  invalid: [],
});
