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
// https://sonarsource.github.io/rspec/#/rspec/S6767/javascript

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import type estree from 'estree';
// eslint-disable-next-line import/no-internal-modules
import ReactComponents from 'eslint-plugin-react/lib/util/Components.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { findComponentNodes } from '../helpers/react.js';
import { hasOwnCustomSuperclassPropsForwarding } from './custom-superclass-forwarding.js';
import { hasDecoratorPropUsage } from './decorator-indirect-prop-usage.js';
import { hasForwardRefCallbackPropUsage } from './forward-ref-indirect-prop-usage.js';
import * as meta from './generated-meta.js';
import { isUsedAsReactComponentNonPropsType } from './react-non-props-usage.js';
import { hasSupportedWholePropsUsage } from './whole-props-usage.js';

type RuleConfiguration = {
  ignore: string[];
  skipShapeProps: boolean;
};
type UsedPropType = {
  allNames?: string[];
  name: string;
};
type ReportedPropNode = TSESTree.Node & {
  key?: estree.Node;
  typeAnnotation?: TSESTree.TSTypeAnnotation;
};
type ReportedProp = {
  children?: ReportedProps;
  fullName?: string;
  name: string;
  node?: ReportedPropNode;
  type?: string;
};
type ReportedProps = Record<string, ReportedProp | true> | true;
type ReactComponent = {
  declaredPropTypes?: ReportedProps;
  ignoreUnusedPropTypesValidation?: boolean;
  node: estree.Node;
  usedPropTypes?: UsedPropType[];
};
type ReactComponentsRegistry = {
  list(): Record<string, ReactComponent>;
};
type ComponentNodePredicate = (
  componentNode: estree.Node,
  context: Rule.RuleContext,
  propName: string | undefined,
) => boolean;

const Components = ReactComponents as unknown as {
  detect(
    rule: (context: Rule.RuleContext, components: ReactComponentsRegistry) => Rule.RuleListener,
  ): (context: Rule.RuleContext) => Rule.RuleListener;
};

function allMatch(
  componentNodes: estree.Node[],
  predicate: ComponentNodePredicate,
  context: Rule.RuleContext,
  propName: string | undefined,
): boolean {
  return (
    componentNodes.length > 0 &&
    componentNodes.every(componentNode => predicate(componentNode, context, propName))
  );
}

function mustBeValidated(component: ReactComponent): boolean {
  return !component.ignoreUnusedPropTypesValidation;
}

function getConfiguration(context: Rule.RuleContext): RuleConfiguration {
  return {
    ignore: [],
    skipShapeProps: true,
    ...(context.options[0] as Partial<RuleConfiguration> | undefined),
  };
}

function isIgnored(name: string, configuration: RuleConfiguration): boolean {
  return configuration.ignore.includes(name);
}

function isPropUsed(component: ReactComponent, prop: ReportedProp): boolean {
  const usedPropTypes = component.usedPropTypes ?? [];
  return usedPropTypes.some(
    usedProp =>
      prop.type === 'shape' ||
      prop.type === 'exact' ||
      prop.name === '__ANY_KEY__' ||
      usedProp.name === prop.name,
  );
}

function shouldSuppressUnusedPropType(
  componentNode: estree.Node,
  node: estree.Node,
  context: Rule.RuleContext,
  propName: string,
): boolean {
  // FP remediation escape 1:
  // upstream can misreport React class non-props generic declarations such as
  // state or snapshot types as unused props; suppress only for the component
  // whose current report comes from that non-props slot.
  if (isUsedAsReactComponentNonPropsType(node, componentNode, context)) {
    return true;
  }

  const componentNodes = findComponentNodes(node, context);

  // FP remediation escape 2:
  // the component already consumes whole props through a supported pattern such as
  // helper-call forwarding, spread usage, or computed access.
  if (allMatch(componentNodes, hasSupportedWholePropsUsage, context, propName)) {
    return true;
  }

  // FP remediation escape 3:
  // the component constructor forwards `props` to its own non-React superclass,
  // which this decorator treats as sufficient indirect usage.
  if (allMatch(componentNodes, hasOwnCustomSuperclassPropsForwarding, context, propName)) {
    return true;
  }

  // FP remediation escape 4:
  // the specific reported prop is consumed inside a `forwardRef` callback that
  // closes over the component's original props binding.
  if (allMatch(componentNodes, hasForwardRefCallbackPropUsage, context, propName)) {
    return true;
  }

  // FP remediation escape 5:
  // the specific reported prop is consumed through a typed decorator callback,
  // either on a decorator factory call or on a class decorator annotation.
  return allMatch(componentNodes, hasDecoratorPropUsage, context, propName);
}

function reportUnusedPropType(
  context: Rule.RuleContext,
  component: ReactComponent,
  props: ReportedProps,
  configuration: RuleConfiguration,
): void {
  if (props === true) {
    return;
  }

  Object.values(props ?? {}).forEach(prop => {
    if (prop === true) {
      return;
    }

    if ((prop.type === 'shape' || prop.type === 'exact') && configuration.skipShapeProps) {
      return;
    }

    if (
      prop.node?.typeAnnotation?.typeAnnotation.type === 'TSNeverKeyword' ||
      !prop.node ||
      isPropUsed(component, prop)
    ) {
      if (prop.children) {
        reportUnusedPropType(context, component, prop.children, configuration);
      }
      return;
    }

    const propName = prop.fullName ?? prop.name;
    if (isIgnored(propName, configuration)) {
      if (prop.children) {
        reportUnusedPropType(context, component, prop.children, configuration);
      }
      return;
    }

    const reportNode = (prop.node.key ?? prop.node) as unknown as estree.Node;
    if (!shouldSuppressUnusedPropType(component.node, reportNode, context, propName)) {
      context.report({
        messageId: 'unusedPropType',
        node: reportNode,
        data: { name: propName },
      });
    }

    if (prop.children) {
      reportUnusedPropType(context, component, prop.children, configuration);
    }
  });
}

/**
 * Decorates `react/no-unused-prop-types` with SonarJS-specific false-positive
 * remediations for indirect props usage patterns:
 * - React class state/snapshot type declarations misreported as props by upstream
 * - supported whole-props handoff patterns
 * - forwarding to a custom non-React superclass
 * - `forwardRef` callbacks that close over the component props binding
 * - typed decorator callbacks that consume component props indirectly
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    meta: generateMeta(meta, rule.meta),
    create: Components.detect((context, components) => {
      const configuration = getConfiguration(context);

      function reportUnusedPropTypes(component: ReactComponent) {
        reportUnusedPropType(
          context,
          component,
          component.declaredPropTypes ?? true,
          configuration,
        );
      }

      return {
        'Program:exit'() {
          Object.values(components.list())
            .filter(component => mustBeValidated(component))
            .forEach(component => {
              reportUnusedPropTypes(component);
            });
        },
      };
    }),
  };
}
