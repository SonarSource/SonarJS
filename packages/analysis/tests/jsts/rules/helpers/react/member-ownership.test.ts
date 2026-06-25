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
import { getNodeParent } from '../../../../../src/jsts/rules/helpers/ancestor.js';
import { isRequiredParserServices } from '../../../../../src/jsts/rules/helpers/parser-services.js';
import {
  collectComponentNodes,
  createComponentAnalysis,
} from '../../../../../src/jsts/rules/helpers/react/component-analysis.js';
import {
  componentPropsIncludeReportedTypeMember,
  getReportedTypeMember,
} from '../../../../../src/jsts/rules/helpers/react/member-ownership.js';
import { getReportedTypeFromAncestors } from '../../../../../src/jsts/rules/helpers/reported-type.js';

const fixtureDirectory = path.join(import.meta.dirname, '../../../tools/testers/fixtures');
const fixtureFilePath = path.join(fixtureDirectory, 'placeholder.tsx');

const ruleTester = new RuleTester({
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: fixtureDirectory,
  },
});

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

let visitedReportedMember = false;

const memberOwnershipRule: Rule.RuleModule = {
  meta: {
    messages: {},
  },
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      throw new Error('Expected required parser services');
    }

    return {
      TSPropertySignature(node) {
        if (node.key.type !== 'Identifier' || node.key.name !== 'cachedRelayMismatch') {
          return;
        }

        const ancestors = context.sourceCode.getAncestors(node.key);
        if (
          !ancestors.some(
            ancestor => (ancestor as { type?: string }).type === 'TSInterfaceDeclaration',
          )
        ) {
          return;
        }

        visitedReportedMember = true;

        const checker = services.program.getTypeChecker();
        const reportedType = getReportedTypeFromAncestors(ancestors, services, checker);
        const reportedMember = getReportedTypeMember(ancestors, services, checker);

        assert.ok(reportedType);
        assert.equal(reportedType.name, 'CachedSharedProps');
        assert.ok(reportedMember);
        assert.equal(reportedMember.name, 'cachedRelayMismatch');

        const matchingComponentNames = collectComponentNodes(
          context.sourceCode.ast,
          context.sourceCode.visitorKeys,
        )
          .map(componentNode => ({
            name: getComponentName(componentNode),
            matches: componentPropsIncludeReportedTypeMember(
              createComponentAnalysis(componentNode, services),
              checker,
              reportedType,
              reportedMember,
            ),
          }))
          .filter(
            (componentSummary): componentSummary is { name: string; matches: true } =>
              componentSummary.matches && componentSummary.name !== undefined,
          )
          .map(componentSummary => componentSummary.name);

        assert.deepStrictEqual(matchingComponentNames, ['CachedRelayWrapper']);
      },
      'Program:exit'() {
        assert.ok(visitedReportedMember, 'Expected to visit cachedRelayMismatch in the fixture');
      },
    };
  },
};

ruleTester.run('member-ownership', memberOwnershipRule, {
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
}

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
  ],
  invalid: [],
});
