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
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

const ruleTester = new NoTypeCheckingRuleTester();

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
          name: 'super(props) with helper function still suppresses via helper pattern',
          code: `
            import * as React from 'react';
            interface ThemeProps {
              theme: string;
              children: React.ReactNode;
            }
            declare function initTheme(props: ThemeProps): void;
            class ThemeProvider extends React.Component<ThemeProps> {
              constructor(props: ThemeProps) {
                super(props);
                initTheme(props);
              }
              render() {
                return <div>{this.props.children}</div>;
              }
            }
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
          name: 'props passed as JSX attribute value',
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
        {
          name: 'props passed as JSX attribute to child component',
          code: `
            import * as React from 'react';
            declare function QueryRenderer(p: any): any;
            const MyRenderer: React.FC<{ id: string }> = (props) => {
              return <QueryRenderer variables={props} />;
            };
          `,
        },
        {
          name: 'props used as object property value',
          code: `
            import * as React from 'react';
            declare function NavigatorIOS(p: any): any;
            const Flow: React.FC<{ saleID: string }> = (props) => {
              return (
                <NavigatorIOS
                  initialRoute={{
                    component: Flow,
                    passProps: props,
                  }}
                />
              );
            };
          `,
        },
        {
          name: 'JSX spread attribute',
          code: `
            import * as React from 'react';
            interface PanelProps {
              className?: string;
              style?: React.CSSProperties;
              children: React.ReactNode;
            }
            const Panel: React.FC<PanelProps> = (props) => {
              return <div {...props} />;
            };
          `,
        },
        {
          name: 'class component with Relay HOC export',
          code: `
            import * as React from 'react';
            interface ViewProps {
              viewer: any;
              model: any;
              relay: any;
            }
            declare function createContainer(c: any, q: any): any;
            class View extends React.Component<ViewProps> {
              render() {
                return <div>{this.props.viewer.name}</div>;
              }
            }
            export default createContainer(View, {});
          `,
        },
        {
          name: 'props passed to external render function',
          code: `
            import * as React from 'react';
            interface PageProps {
              backIcon: React.ReactNode;
              title: string;
              footer: React.ReactNode;
            }
            declare function renderTitle(prefixCls: string, props: PageProps): React.ReactNode;
            const PageHeader: React.FC<PageProps> = (props) => {
              return <div>{renderTitle('page', props)}</div>;
            };
          `,
        },
        {
          name: 'class with method decorator consuming props',
          code: `
            import * as React from 'react';
            declare function track(fn?: any): any;
            interface CTAProps {
              href?: string;
              contextModule?: string;
              label: string;
            }
            @track()
            class ContextGridCTA extends React.Component<CTAProps> {
              @track((props: any) => ({
                context_module: props.contextModule,
              }))
              openLink() {
                const { href } = this.props;
              }
              render() {
                const { href, label } = this.props;
                return <a href={href}>{label}</a>;
              }
            }
          `,
        },
        {
          name: 'props accessed in nested function closure',
          code: `
            import * as React from 'react';
            interface RailProps {
              title: string;
              subtitle?: string;
              items: any[];
            }
            const Rail: React.FC<RailProps> = (props) => {
              const Header = () => (
                <div>
                  <h2>{props.title}</h2>
                  <p>{props.subtitle}</p>
                </div>
              );
              return (
                <div>
                  <Header />
                  {props.items.map(i => <span key={i} />)}
                </div>
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
        {
          name: 'multiple unused props without indirect usage',
          code: `
            import * as React from 'react';
            interface ListProps {
              items: string[];
              onSelect: (item: string) => void;
              className?: string;
            }
            class List extends React.Component<ListProps> {
              render() {
                return <ul />;
              }
            }
          `,
          errors: 3,
        },
        {
          name: 'decorator without props callback does not suppress',
          code: `
            import * as React from 'react';
            declare function track(opts?: any): any;
            interface BtnProps {
              size?: string;
            }
            @track()
            class Btn extends React.Component<BtnProps> {
              @track({ action: 'click' })
              handleClick() {}
              render() {
                return <button />;
              }
            }
          `,
          errors: 1,
        },
        {
          name: 'super(props) alone does not suppress',
          code: `
            import * as React from 'react';
            interface TimerProps {
              date: Date;
              abbreviate?: boolean;
            }
            class RelativeTime extends React.Component<TimerProps> {
              constructor(props: TimerProps) {
                super(props);
              }
              render() {
                return <span>{this.props.date.toISOString()}</span>;
              }
            }
          `,
          errors: 1,
        },
        {
          name: 'class with constructor super(props) and property accesses does not suppress',
          code: `
            import * as React from 'react';
            interface TimerProps {
              date: Date;
              abbreviate?: boolean;
              className?: string;
            }
            export class Timer extends React.Component<TimerProps> {
              constructor(props: TimerProps) {
                super(props);
                this.state = { text: '' };
              }
              render() {
                return <span className={this.props.className}>{this.props.date.toISOString()}</span>;
              }
            }
          `,
          errors: 1,
        },
        {
          name: 'functional component with unused prop',
          code: `
            import * as React from 'react';
            interface TabProps {
              tabLabel: string;
            }
            const Tab: React.FC<TabProps> = ({ children }) => (
              <div>{children}</div>
            );
          `,
          errors: 1,
        },
        {
          name: 'nested function with own props parameter does not suppress',
          code: `
            import * as React from 'react';
            interface WrapperProps {
              unused: string;
            }
            const mapper = {
              value: (props: any) => props.data,
            };
            class Wrapper extends React.Component<WrapperProps> {
              render() {
                return <div>{mapper.value({ data: 1 })}</div>;
              }
            }
          `,
          errors: 1,
        },
      ],
    });
  });
});
