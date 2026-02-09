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
  it('should not flag props used through indirect patterns', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('Unused React typed props should be removed', rule, {
      valid: [
        {
          // FP: Props passed to helper method
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
          // FP: Props accessed via dynamic bracket notation
          code: `
            import * as React from 'react';

            interface ConfigProviderProps {
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
        {
          // FP: Props stored in state via getDerivedStateFromProps lifecycle
          // The static method captures the entire props object into state,
          // and the component uses the state snapshot in render. The upstream
          // rule cannot track prop usage through state.
          code: `
            import * as React from 'react';

            interface SwitcherProps {
              readOnly: boolean;
              imageDiffType: string;
              hideWhitespace: boolean;
            }

            interface SwitcherState {
              propSnapshot: SwitcherProps;
            }

            export default class DiffSwitcher extends React.Component<SwitcherProps, SwitcherState> {
              static getDerivedStateFromProps(props: SwitcherProps): Partial<SwitcherState> {
                return { propSnapshot: props };
              }
              constructor(props: SwitcherProps) {
                super(props);
                this.state = { propSnapshot: props };
              }
              render() {
                const { readOnly, imageDiffType } = this.state.propSnapshot;
                return <div>{readOnly ? imageDiffType : 'editable'}</div>;
              }
            }
          `,
        },
        {
          // All props are used directly
          code: `
            import * as React from 'react';

            interface GreetingProps {
              name: string;
              greeting: string;
            }

            class Greeting extends React.Component<GreetingProps> {
              render() {
                return <h1>{this.props.greeting}, {this.props.name}!</h1>;
              }
            }
          `,
        },
        {
          // Functional component with all props used
          code: `
            import * as React from 'react';

            type BadgeProps = {
              label: string;
              count: number;
            };

            const Badge: React.FC<BadgeProps> = ({ label, count }) => {
              return <span>{label}: {count}</span>;
            };

            export default Badge;
          `,
        },
      ],
      invalid: [
        {
          // Truly unused prop in class component
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
        {
          // Unused prop in functional component
          code: `
            import * as React from 'react';

            interface CardProps {
              title: string;
              subtitle: string;
            }

            const Card: React.FC<CardProps> = ({ title }) => {
              return <div>{title}</div>;
            };

            export default Card;
          `,
          errors: 1,
        },
        {
          // super(props) is standard boilerplate - should NOT suppress issues
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
          errors: 1,
        },
        {
          // Exported Props interface alone should NOT suppress issues
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
          errors: 1,
        },
        {
          // HOC wrapper alone should NOT suppress issues
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
          errors: 1,
        },
        {
          // getDerivedStateFromProps with destructured params should NOT suppress
          code: `
            import * as React from 'react';

            interface ListProps {
              filteredItems: string[];
              filteredRenderItems: string[];
              selectedKeys: string[];
            }

            class ListBody extends React.Component<ListProps> {
              static getDerivedStateFromProps(
                { filteredRenderItems }: ListProps,
                { current }: { current: number },
              ) {
                return filteredRenderItems.length > current ? { current: 0 } : null;
              }
              render() {
                return <ul>{this.props.filteredRenderItems.map(i => <li key={i}>{i}</li>)}</ul>;
              }
            }
          `,
          errors: 2,
        },
        {
          // Redux connect should NOT suppress unused prop issues
          code: `
            import * as React from 'react';

            interface ViewProps {
              auth: { token: string };
              dispatch: Function;
            }

            declare function connect(mapState: any): (comp: any) => any;

            class View extends React.Component<ViewProps> {
              render() {
                return <div>Hello</div>;
              }
            }

            export default connect((state: any) => ({ auth: state.auth }))(View);
          `,
          errors: 2,
        },
      ],
    });
  });
});
