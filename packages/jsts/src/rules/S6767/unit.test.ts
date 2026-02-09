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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S6767', () => {
  it('S6767', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('Unused React typed props should be removed', rule, {
      valid: [
        {
          // FP: Props passed to helper method
          // The rule doesn't track prop usage through function calls
          code: `
            import * as React from 'react';

            interface IconProps {
              name: string;
              color: string;
            }

            function getIconStyle(props: IconProps): React.CSSProperties {
              return { color: props.color };
            }

            export default class Icon extends React.Component<IconProps> {
              render() {
                const style = getIconStyle(this.props);
                return <span style={style}>{this.props.name}</span>;
              }
            }
          `,
        },
        {
          // FP: Props passed to parent class via super(props)
          // The rule can't track props consumed by the parent constructor
          code: `
            import * as React from 'react';

            interface ThemeProps {
              theme: string;
              children: React.ReactNode;
            }

            export default class ThemeProvider extends React.Component<ThemeProps> {
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
          // FP: Props interface is exported (public API contract)
          // Consumers may use the prop through HOC wrappers or styled-components
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
          // FP: Component exported via HOC wrapper
          // The HOC injects/consumes the styles prop
          code: `
            import * as React from 'react';

            interface ButtonProps {
              label: string;
              styles: Record<string, string>;
            }

            declare function withTheme<P extends { styles?: Record<string, string> }>(
              Component: React.ComponentType<P>
            ): React.FC<Omit<P, 'styles'>>;

            class Button extends React.Component<ButtonProps> {
              render() {
                return <button>{this.props.label}</button>;
              }
            }

            export default withTheme(Button);
          `,
        },
        {
          // FP: Props accessed via dynamic bracket notation
          // The rule can't track computed property access as prop usage
          code: `
            import * as React from 'react';

            export interface ConfigProviderProps {
              prefixCls?: string;
              children?: React.ReactNode;
              input?: { autoComplete?: string };
              form?: { colon?: boolean };
            }

            const PASSED_PROPS: (keyof ConfigProviderProps)[] = ['input', 'form'];

            export default class ConfigProvider extends React.Component<ConfigProviderProps> {
              render() {
                const config: Record<string, unknown> = {};
                PASSED_PROPS.forEach((propName) => {
                  const value = this.props[propName];
                  if (value) {
                    config[propName] = value;
                  }
                });
                return (
                  <div className={this.props.prefixCls}>
                    {this.props.children}
                  </div>
                );
              }
            }
          `,
        },
        {
          // FP: Entire props object passed to context provider
          // The rule doesn't track that passing props makes all properties available
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

            export default ConfigProvider;
          `,
        },
        {
          // FP: Component wrapped in React.forwardRef
          // The rule doesn't properly track props through forwardRef wrappers
          code: `
            import * as React from 'react';

            interface InputProps {
              value: string;
              size: 'small' | 'medium' | 'large';
              onChange: (value: string) => void;
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

            Input.displayName = 'Input';

            export default Input;
          `,
        },
        {
          // FP: Props spread in JSX via rest destructuring
          // All remaining props are passed through to the child element
          code: `
            import * as React from 'react';

            interface WrapperProps {
              className: string;
              disabled: boolean;
              children: React.ReactNode;
            }

            const Wrapper: React.FC<WrapperProps> = (props) => {
              const { children, ...rest } = props;
              return <div {...rest}>{children}</div>;
            };

            export default Wrapper;
          `,
        },
        {
          // FP: this.props spread directly in class component
          // All props are forwarded to the child element
          code: `
            import * as React from 'react';

            interface PanelProps {
              title: string;
              collapsible: boolean;
              children: React.ReactNode;
            }

            export default class Panel extends React.Component<PanelProps> {
              render() {
                return <div {...this.props}>{this.props.children}</div>;
              }
            }
          `,
        },
      ],
      invalid: [
        {
          // Truly unused prop - no indirect usage patterns present
          code: `
            import * as React from 'react';

            type Props = {
              name: string;
            };

            class Hello extends React.Component<Props> {
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
