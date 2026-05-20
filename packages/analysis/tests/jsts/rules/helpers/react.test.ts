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
import type { Rule } from 'eslint';
import type estree from 'estree';
import { DefaultParserRuleTester, RuleTester } from '../../tools/testers/rule-tester.js';
import { getNodeParent } from '../../../../src/jsts/rules/helpers/ancestor.js';
import { isRequiredParserServices } from '../../../../src/jsts/rules/helpers/parser-services.js';
import { findComponentNodes } from '../../../../src/jsts/rules/helpers/react.js';

function hasIdentifierId(node: estree.Node): node is estree.Node & { id: estree.Identifier } {
  return 'id' in node && node.id != null && node.id.type === 'Identifier';
}

function getComponentName(componentNode: estree.Node): string | undefined {
  const parent = getNodeParent(componentNode);
  if (
    (componentNode.type === 'ClassExpression' || componentNode.type === 'FunctionExpression') &&
    parent?.type === 'VariableDeclarator' &&
    parent.id.type === 'Identifier'
  ) {
    return parent.id.name;
  }

  if (hasIdentifierId(componentNode)) {
    return componentNode.id.name;
  }

  return parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier'
    ? parent.id.name
    : undefined;
}

const ruleTester = new DefaultParserRuleTester();
const typeCheckingRuleTester = new RuleTester();

const findComponentNodesRule: Rule.RuleModule = {
  meta: {
    messages: {
      unresolvedComponentOwners: 'Component owners could not be resolved from the props type',
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    const validateComponentOwners = (reportedNode: estree.Node, expectedNames: string[]) => {
      const componentNames = findComponentNodes(reportedNode, context)
        .map(getComponentName)
        .filter((name): name is string => name !== undefined)
        .sort();
      const sortedExpectedNames = [...expectedNames].sort();
      if (JSON.stringify(componentNames) !== JSON.stringify(sortedExpectedNames)) {
        context.report({
          node: reportedNode,
          messageId: 'unresolvedComponentOwners',
        });
      }
    };

    return {
      TSPropertySignature(node) {
        if (node.key.type === 'Identifier' && node.key.name === 'label') {
          validateComponentOwners(node.key, ['Button']);
        }
        if (node.key.type === 'Identifier' && node.key.name === 'relay') {
          validateComponentOwners(node.key, ['SavedSearchesList', 'SavedSearchesListWrapper']);
        }
        if (node.key.type === 'Identifier' && node.key.name === 'cachedRelay') {
          validateComponentOwners(node.key, ['CachedRelayChild', 'CachedRelayWrapper']);
        }
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'cachedRelayMismatch' &&
          context.sourceCode
            .getAncestors(node)
            .some(ancestor => (ancestor as { type: string }).type === 'TSInterfaceDeclaration')
        ) {
          validateComponentOwners(node.key, ['CachedRelayWrapper']);
        }
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'relayMismatch' &&
          context.sourceCode
            .getAncestors(node)
            .some(ancestor => (ancestor as { type: string }).type === 'TSInterfaceDeclaration')
        ) {
          validateComponentOwners(node.key, ['SavedSearchesListWrapper']);
        }
        if (node.key.type === 'Identifier' && node.key.name === 'moduleName') {
          validateComponentOwners(node.key, ['InnerPageWrapper', 'PageWrapper']);
        }
        if (node.key.type === 'Identifier' && node.key.name === 'aliasRelay') {
          validateComponentOwners(node.key, ['AliasChild', 'AliasWrapper']);
        }
      },
    };
  },
};

const propTypesOwnerRule: Rule.RuleModule = {
  meta: {
    messages: {
      unresolvedPropTypesOwner: 'Component owner could not be resolved from propTypes',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      Property(node) {
        if (node.key.type !== 'Identifier' || node.key.name !== 'label') {
          return;
        }

        const componentNames = findComponentNodes(node.key, context)
          .map(getComponentName)
          .filter((name): name is string => name !== undefined)
          .sort();

        if (JSON.stringify(componentNames) !== JSON.stringify(['Button'])) {
          context.report({
            node: node.key,
            messageId: 'unresolvedPropTypesOwner',
          });
        }
      },
    };
  },
};

typeCheckingRuleTester.run('findComponentNodes', findComponentNodesRule, {
  valid: [
    {
      code: `
declare const React: any;

interface ButtonProps {
  label: string;
}

function Button(props: ButtonProps) {
  return <div>{props.label}</div>;
}
`,
    },
    {
      code: `
declare const React: any;

interface ButtonProps {
  label: string;
}

class Button extends React.Component<ButtonProps> {
  render() {
    return <div>{this.props.label}</div>;
  }
}
`,
    },
    {
      code: `
import * as React from 'react';

interface ButtonProps {
  label: string;
}

const Button: React.FC<ButtonProps> = props => props.label;
`,
    },
    {
      code: `
import * as React from 'react';

interface ButtonProps {
  label: string;
}

const Button: React.FC<ButtonProps> & { Group?: string } = props => props.label;
`,
    },
    {
      code: `
import * as React from 'react';

interface ButtonProps {
  label: string;
}

const Button: React.ForwardRefRenderFunction<unknown, ButtonProps> = (props, ref) => props.label;
`,
    },
    {
      code: `
import * as React from 'react';

interface SharedProps {
  relay: string;
}

interface ChildProps extends SharedProps {
  title: string;
}

const SavedSearchesList: React.FC<ChildProps> = props => props.title;
const SavedSearchesListWrapper: React.FC<SharedProps> = props => props.relay;
`,
    },
    {
      code: `
import * as React from 'react';

interface SharedProps {
  relayMismatch: string;
}

type ChildProps = SharedProps & {
  relayMismatch: number;
  title: string;
};

const SavedSearchesList: React.FC<ChildProps> = props => props.title;
const SavedSearchesListWrapper: React.FC<SharedProps> = props => props.relayMismatch;
`,
    },
    {
      code: `
import * as React from 'react';

interface PageWrapperProps {
  moduleName: string;
  viewProps: { isVisible: boolean };
}

const InnerPageWrapper: React.FC<PageWrapperProps> = ({ viewProps }) => {
  return <div>{String(viewProps.isVisible)}</div>;
};

class PageWrapper extends React.Component<PageWrapperProps> {
  componentDidUpdate() {
    if (this.props.moduleName === 'Map') {
      return;
    }
  }

  render() {
    return <InnerPageWrapper {...this.props} />;
  }
}
`,
    },
    {
      code: `
import * as React from 'react';

type SharedAlias = {
  aliasRelay: string;
};

type AliasChildProps = SharedAlias & {
  title: string;
};

const AliasChild: React.FC<AliasChildProps> = props => props.title;
const AliasWrapper: React.FC<SharedAlias> = props => props.aliasRelay;
`,
    },
    {
      code: `
import * as React from 'react';

interface CachedSharedProps {
  cachedRelay: string;
  cachedRelayMismatch: string;
}

type CachedChildProps = CachedSharedProps & {
  cachedRelayMismatch: number;
  title: string;
};

const CachedRelayChild: React.FC<CachedChildProps> = props => props.title;
const CachedRelayWrapper: React.FC<CachedSharedProps> = props => props.cachedRelay;
`,
    },
    {
      code: `
declare const React: any;

interface ButtonProps {
  label: string;
}

class Button extends React.Component {
  props: ButtonProps;

  render() {
    return <div>{this.props.label}</div>;
  }
}
`,
    },
  ],
  invalid: [
    {
      code: `
declare const React: any;

interface ButtonProps {
  label: string;
}

class Button extends React.Component {
  render() {
    return <div />;
  }
}
`,
      errors: 1,
    },
    {
      code: `
interface ButtonProps {
  label: string;
}

const renderButton = (props: ButtonProps) => props.label;
`,
      errors: 1,
    },
  ],
});

ruleTester.run('findComponentNodes / propTypes', propTypesOwnerRule, {
  valid: [
    {
      code: `
function Button() {
  return null;
}

Button.propTypes = {
  label: true,
};
`,
    },
  ],
  invalid: [],
});
