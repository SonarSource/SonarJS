/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { rule } from './index.js';
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S6767', () => {
  it('S6767', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-unused-prop-types', rule, {
      valid: [
        {
          code: `
import React from 'react';
interface Props { name: string; }
class Hello extends React.Component<Props> {
  render() { return <div>{this.props.name}</div>; }
}`,
        },
        {
          // Compliant: props passed to helper function
          code: `
import * as React from 'react';
interface BarProps { x: number; y: number; barOffset: number[]; }
function getBarPath(props: BarProps): string { return \`M\${props.x},\${props.y}\`; }
export default class Bar extends React.Component<BarProps> {
  render() {
    const path = getBarPath(this.props);
    return <path d={path} />;
  }
}`,
        },
        {
          // Compliant: bracket notation access
          code: `
import * as React from 'react';
interface ConfigProps { prefixCls?: string; children?: React.ReactNode; input?: object; form?: object; }
const PASSED_PROPS: (keyof ConfigProps)[] = ['input', 'form'];
export default class ConfigProvider extends React.Component<ConfigProps> {
  render() {
    const config: Record<string, unknown> = {};
    PASSED_PROPS.forEach((propName) => {
      const value = this.props[propName];
      if (value) config[propName] = value;
    });
    return <div className={this.props.prefixCls}>{this.props.children}</div>;
  }
}`,
        },
        {
          // Compliant: this.props spread
          code: `
import * as React from 'react';
interface WrapperProps { className: string; id: string; children: React.ReactNode; }
class Wrapper extends React.Component<WrapperProps> {
  render() {
    const merged = { ...this.props, extra: true };
    return <div className={merged.className}>{merged.children}</div>;
  }
}
export default Wrapper;`,
        },
        {
          // Compliant: React.forwardRef wrapper
          code: `
import * as React from 'react';
interface InputProps { value: string; size: 'small' | 'medium' | 'large'; onChange: (value: string) => void; }
const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { value, onChange } = props;
  return <input ref={ref} value={value} onChange={(e) => onChange(e.target.value)} />;
});
export default Input;`,
        },
        {
          // Compliant: bare forwardRef (named import, not React.forwardRef)
          code: `
import * as React from 'react';
import { forwardRef } from 'react';
interface InputProps { value: string; size: 'small' | 'medium' | 'large'; }
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { value } = props;
  return <input ref={ref} value={value} />;
});
export default Input;`,
        },
        {
          // Compliant: props passed to context provider
          code: `
import * as React from 'react';
interface ConfigProps { theme: string; locale: string; children: React.ReactNode; }
const ConfigContext = React.createContext<Partial<ConfigProps>>({});
const ConfigProvider: React.FC<ConfigProps> = (props) => {
  const { children } = props;
  return <ConfigContext.Provider value={props}>{children}</ConfigContext.Provider>;
};
export default ConfigProvider;`,
        },
        {
          // Compliant: all props directly used even with super(props) in constructor
          code: `
import * as React from 'react';
interface ThemeProps { theme: string; children: React.ReactNode; }
export default class ThemeProvider extends React.Component<ThemeProps> {
  constructor(props: ThemeProps) {
    super(props);
  }
  render() { return <div className={this.props.theme}>{this.props.children}</div>; }
}`,
        },
        {
          // Compliant: all props directly used even when interface is exported
          code: `
import * as React from 'react';
export interface ButtonProps { label: string; variant: 'primary' | 'secondary'; onClick?: () => void; }
const Button: React.FC<ButtonProps> = (props) => {
  const { label, onClick, variant } = props;
  return <button className={variant} onClick={onClick}>{label}</button>;
};
export default Button;`,
        },
      ],
      invalid: [
        {
          // Non-compliant: genuinely unused prop
          code: `
import React from 'react';
interface Props { name: string; }
class Hello extends React.Component<Props> {
  render() { return <div>Hello</div>; }
}`,
          errors: 1,
        },
        {
          // Non-compliant: super(props) alone does not suppress unused props
          code: `
import * as React from 'react';
interface ThemeProps { theme: string; children: React.ReactNode; }
export default class ThemeProvider extends React.Component<ThemeProps> {
  constructor(props: ThemeProps) {
    super(props);
  }
  render() { return <div>{this.props.children}</div>; }
}`,
          errors: 1,
        },
        {
          // Non-compliant: HOC export alone does not suppress unused props
          code: `
import * as React from 'react';
interface ButtonProps { label: string; styles: Record<string, string>; }
declare function withTheme<P extends { styles?: Record<string, string> }>(Component: React.ComponentType<P>): React.FC<Omit<P, 'styles'>>;
class Button extends React.Component<ButtonProps> {
  render() { return <button>{this.props.label}</button>; }
}
export default withTheme(Button);`,
          errors: 1,
        },
        {
          // Non-compliant: exported interface alone does not suppress unused props
          code: `
import * as React from 'react';
export interface ButtonProps { label: string; variant: string; onClick: () => void; }
class Button extends React.Component<ButtonProps> {
  render() { return <button onClick={this.props.onClick}>{this.props.label}</button>; }
}
export default Button;`,
          errors: 1,
        },
      ],
    });
  });
});
