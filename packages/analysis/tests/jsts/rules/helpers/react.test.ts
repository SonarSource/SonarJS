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
import { isRequiredParserServices } from '../../../../src/jsts/rules/helpers/parser-services.js';
import {
  findComponentNode,
  getComponentVariable,
  getComponentPropsType,
  isReactComponentSuperclass,
} from '../../../../src/jsts/rules/helpers/react.js';

const rule: Rule.RuleModule = {
  meta: {
    messages: {
      notReactSuperclass: 'Superclass is not a React component base class',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      ClassDeclaration(node) {
        if (node.superClass && !isReactComponentSuperclass(context, node.superClass)) {
          context.report({
            node: node.superClass,
            messageId: 'notReactSuperclass',
          });
        }
      },
    };
  },
};

const ruleTester = new DefaultParserRuleTester();
const typeCheckingRuleTester = new RuleTester();

ruleTester.run('isReactComponentSuperclass', rule, {
  valid: [
    {
      code: `
import { Component as BaseComponent } from 'react';

class Button extends BaseComponent {}
`,
    },
    {
      code: `
import * as UI from 'react';

class Button extends UI.Component {}
`,
    },
    {
      code: `
class Button extends React.Component {}
`,
    },
  ],
  invalid: [
    {
      code: `
class CustomBase {}

class Button extends CustomBase {}
`,
      errors: 1,
    },
  ],
});

const propsTypeRule: Rule.RuleModule = {
  meta: {
    messages: {
      unresolvedComponentPropsType:
        'Component props type could not be resolved or did not match the component name',
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    const checker = services.program.getTypeChecker();
    const validateComponentPropsType = (
      componentNode: estree.Node,
      expectedName: string,
      reportNode: estree.Node,
    ) => {
      const propsType = getComponentPropsType(componentNode, services);
      if (checker.typeToString(propsType ?? checker.getNeverType()) !== `${expectedName}Props`) {
        context.report({
          node: reportNode,
          messageId: 'unresolvedComponentPropsType',
        });
      }
    };

    return {
      FunctionDeclaration(node) {
        if (node.id) {
          validateComponentPropsType(node, node.id.name, node);
        }
      },
      ClassDeclaration(node) {
        if (node.id) {
          validateComponentPropsType(node, node.id.name, node);
        }
      },
      VariableDeclarator(node) {
        if (
          node.id.type !== 'Identifier' ||
          (node.init?.type !== 'ArrowFunctionExpression' &&
            node.init?.type !== 'FunctionExpression')
        ) {
          return;
        }

        validateComponentPropsType(node.init, node.id.name, node);
      },
    };
  },
};

const findComponentNodeRule: Rule.RuleModule = {
  meta: {
    messages: {
      unresolvedComponentOwner: 'Component owner could not be resolved from the props type',
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    const validateComponentOwner = (reportedNode: estree.Node, expectedName: string) => {
      const componentNode = findComponentNode(reportedNode, context);
      const componentName = componentNode
        ? getComponentVariable(context.sourceCode, componentNode)?.name
        : undefined;
      if (componentName !== expectedName) {
        context.report({
          node: reportedNode,
          messageId: 'unresolvedComponentOwner',
        });
      }
    };

    return {
      TSPropertySignature(node) {
        if (node.key.type === 'Identifier' && node.key.name === 'label') {
          validateComponentOwner(node.key, 'Button');
        }
      },
    };
  },
};

typeCheckingRuleTester.run('getComponentPropsType', propsTypeRule, {
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
  ],
  invalid: [
    {
      code: `
declare const React: any;
class Button extends React.Component {
  render() {
    return <div />;
  }
}
`,
      errors: 1,
    },
  ],
});

typeCheckingRuleTester.run('findComponentNode', findComponentNodeRule, {
  valid: [
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
  ],
  invalid: [
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
