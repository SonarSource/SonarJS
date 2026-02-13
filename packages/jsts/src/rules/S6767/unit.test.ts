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
          // Props passed to helper function
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
          // Props passed to super() in constructor
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
          // Exported props interface (public API)
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
          // Component exported via HOC wrapper
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
          // Bracket notation access on props
          code: `
            import * as React from 'react';

            interface ItemProps {
              children: React.ReactNode;
              color: string;
            }

            export default class Item extends React.Component<ItemProps> {
              render() {
                const key = 'color';
                const val = this.props[key];
                return <div style={{ color: val }}>{this.props.children}</div>;
              }
            }
          `,
        },
        {
          // Props passed to context provider value
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
          // Component wrapped in React.forwardRef
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

            export default Input;
          `,
        },
        {
          // Props spread in JSX
          code: `
            import * as React from 'react';

            interface WrapperProps {
              className: string;
              title: string;
              children: React.ReactNode;
            }

            const Wrapper: React.FC<WrapperProps> = (props) => {
              return <div {...props}>{props.children}</div>;
            };

            export default Wrapper;
          `,
        },
      ],
      invalid: [
        {
          // Truly unused prop - no indirect usage patterns
          code: `
            import * as React from 'react';

            interface GreetingProps {
              name: string;
              unused: number;
            }

            class Greeting extends React.Component<GreetingProps> {
              render() {
                return <h1>Hello {this.props.name}</h1>;
              }
            }
          `,
          errors: 1,
        },
      ],
    });
  });
});
