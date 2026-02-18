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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

const ruleTester = new DefaultParserRuleTester();

describe('S6767', () => {
  it('should suppress when props are used indirectly', () => {
    ruleTester.run('Unused React typed props should be removed', rule, {
      valid: [
        {
          name: 'props passed to helper function',
          code: `
            import * as React from 'react';
            interface IconProps {
              name: string;
              color: string;
            }
            function getIconStyle(props: IconProps) {
              return { color: props.color };
            }
            class Icon extends React.Component<IconProps> {
              render() {
                const style = getIconStyle(this.props);
                return <span style={style}>{this.props.name}</span>;
              }
            }
          `,
        },
        {
          name: 'super(props) in constructor',
          code: `
            import * as React from 'react';
            interface ThemeProps {
              theme: string;
              children: React.ReactNode;
            }
            class ThemeProvider extends React.Component<ThemeProps> {
              constructor(props: ThemeProps) {
                super(props);
              }
              render() {
                return <div>{this.props.children}</div>;
              }
            }
          `,
        },
        {
          name: 'exported props interface',
          code: `
            import * as React from 'react';
            export interface ButtonProps {
              label: string;
              variant: 'primary' | 'secondary';
              onClick?: () => void;
            }
            const Button: React.FC<ButtonProps> = (props) => {
              const { label, onClick } = props;
              return <button onClick={onClick}>{label}</button>;
            };
            export default Button;
          `,
        },
        {
          name: 'component exported via HOC wrapper',
          code: `
            import * as React from 'react';
            interface ButtonProps {
              label: string;
              styles: Record<string, string>;
            }
            declare function withTheme<P>(c: React.ComponentType<P>): React.FC<P>;
            class Button extends React.Component<ButtonProps> {
              render() {
                return <button>{this.props.label}</button>;
              }
            }
            export default withTheme(Button);
          `,
        },
        {
          name: 'props accessed via bracket notation',
          code: `
            import * as React from 'react';
            interface ConfigProps {
              prefixCls?: string;
              children?: React.ReactNode;
              input?: { autoComplete?: string };
              form?: { colon?: boolean };
            }
            const KEYS: (keyof ConfigProps)[] = ['input', 'form'];
            class ConfigProvider extends React.Component<ConfigProps> {
              render() {
                KEYS.forEach((k) => { this.props[k]; });
                return <div>{this.props.children}</div>;
              }
            }
          `,
        },
        {
          name: 'props spread to child component',
          code: `
            import * as React from 'react';
            interface WrapperProps {
              className?: string;
              title: string;
              children: React.ReactNode;
            }
            const Wrapper: React.FC<WrapperProps> = (props) => {
              const { children, ...rest } = props;
              return <div {...rest}>{children}</div>;
            };
          `,
        },
        {
          name: 'component wrapped in React.forwardRef',
          code: `
            import * as React from 'react';
            interface InputProps {
              value: string;
              size: 'small' | 'medium' | 'large';
              onChange: (v: string) => void;
            }
            const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
              const { value, onChange } = props;
              return (
                <input
                  ref={ref}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                />
              );
            });
          `,
        },
        {
          name: 'props passed to context provider value',
          code: `
            import * as React from 'react';
            interface ConfigProps {
              theme: string;
              locale: string;
              children: React.ReactNode;
            }
            const ConfigContext = React.createContext<Partial<ConfigProps>>({});
            const ConfigProvider: React.FC<ConfigProps> = (props) => {
              const { children } = props;
              return (
                <ConfigContext.Provider value={props}>
                  {children}
                </ConfigContext.Provider>
              );
            };
          `,
        },
      ],
      invalid: [
        {
          name: 'no indirect usage - prop is truly unused',
          code: `
            import * as React from 'react';
            interface HelloProps {
              name: string;
            }
            class Hello extends React.Component<HelloProps> {
              render() {
                return <div>Hello</div>;
              }
            }
          `,
          errors: 1,
        },
      ],
    });
  });
});
