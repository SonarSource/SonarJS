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
import { describe, it } from 'node:test';
import { rule } from './index.js';
import {
  DefaultParserRuleTester,
  NoTypeCheckingRuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';

const sidebar = 'import { SidebarMenuButton } from "@/components/ui/sidebar";';
const button = 'import { Button } from "@base-ui/react/button";';

for (const [language, Tester] of [
  ['JSX', DefaultParserRuleTester],
  ['TSX', NoTypeCheckingRuleTester],
] as const) {
  describe(`S6827 render-element composition in ${language}`, () => {
    it('recognizes forwarded content while preserving empty-anchor reports', () => {
      new Tester().run('anchor-has-content', rule, {
        valid: [
          {
            code: `${sidebar}<SidebarMenuButton render={<a href="/home" />}>Home</SidebarMenuButton>;`,
          },
          { code: `${button}<Button render={<a />}>Continue</Button>;` },
          {
            code: `import { Button } from '@base-ui-components/react/button'; <Button render={<a />}>Continue</Button>;`,
          },
          {
            code: `import { Button } from '@workspace/ui/components/button'; <Button render={<a />}>Continue</Button>;`,
          },
          {
            code: `import { Button } from './ui/button.js'; <Button render={<a />}>Continue</Button>;`,
          },
          {
            code: `import { Badge } from './ui/badge.ts'; <Badge render={<a />}>Continue</Badge>;`,
          },
          {
            code: `import { Button } from '@base-ui/react'; <Button render={<a />}>Continue</Button>;`,
          },
          {
            code: `import { Button as LinkButton } from '@base-ui/react/button'; <LinkButton render={<a />}>Continue</LinkButton>;`,
          },
          {
            code: `import * as UI from '@base-ui/react'; <UI.Button render={<a />}>Continue</UI.Button>;`,
          },
          {
            code: `import { Button as BaseButton } from '@base-ui/react/button'; const LinkButton = BaseButton; <LinkButton render={<a />}>Continue</LinkButton>;`,
          },
          {
            code: `import { SidebarMenuButton as MenuLink } from '../components/ui/sidebar'; <MenuLink render={<a />}>Continue</MenuLink>;`,
          },
          {
            code: `import * as Sidebar from '@/components/ui/sidebar'; <Sidebar.SidebarMenuSubButton render={<a />}>Continue</Sidebar.SidebarMenuSubButton>;`,
          },
          {
            code: `import { Button } from '~/components/ui/button'; <Button render={<a />}>Continue</Button>;`,
          },
          { code: `import { Badge } from './ui/badge.tsx'; <Badge render={<a />}>Status</Badge>;` },
          { code: `${sidebar}<SidebarMenuButton render={<a />}>{children}</SidebarMenuButton>;` },
          { code: `${sidebar}<SidebarMenuButton render={<a />}>{link.label}</SidebarMenuButton>;` },
          {
            code: `${sidebar}<SidebarMenuButton render={external ? <a href="https://example.com" /> : <Link />}>Continue</SidebarMenuButton>;`,
          },
          { code: `${button}<Button render={external ? <a /> : <a />}>Continue</Button>;` },
          { code: `${button}<Button render={external && <a />}>Continue</Button>;` },
          { code: `${button}<Button render={external || <a />}>Continue</Button>;` },
          { code: `${button}<Button render={external ?? <a />}>Continue</Button>;` },
          { code: `${button}const link = <a />; <Button render={link}>Continue</Button>;` },
          {
            code: `${button}const link = <a />; const alias = link; <Button render={alias}>Continue</Button>;`,
          },
          {
            code: `${button}const link = <a />; <><Button render={link}>Home</Button><Button render={link}>Menu</Button></>;`,
          },
          { code: `${button}<Button render={<a />} children="Continue" />;` },
          {
            code: `${button}<Button render={<a />} dangerouslySetInnerHTML={{__html: 'Continue'}} />;`,
          },
          {
            code: `${button}<Button render={<a />}><span dangerouslySetInnerHTML={{__html: 'Continue'}} /></Button>;`,
          },
          {
            code: `${button}const html = {__html: 'Continue'}; <Button render={<a />} dangerouslySetInnerHTML={html} />;`,
          },
          { code: `${button}<Button render={<a />} dangerouslySetInnerHTML={{__html: html}} />;` },
          {
            code: `${button}<Button render={<a />} dangerouslySetInnerHTML={{__html: '<span>Continue</span>'}} />;`,
          },
          {
            code: `${button}<Button render={<a />} dangerouslySetInnerHTML={{__html: '<img alt="Continue">'}} />;`,
          },
          ...['Continue', '<span>Continue</span>', '<img alt="Continue">'].map(html => ({
            code: `${button}<Button render={<a />} dangerouslySetInnerHTML={{__html: \`${html}\`}} />;`,
          })),
          {
            code: `${button}const html = \`<span>Continue</span>\`; <Button render={<a />} dangerouslySetInnerHTML={{__html: html}} />;`,
          },
          {
            code: `${button}<Button render={<a />} dangerouslySetInnerHTML={{__html: \`<span>\${label}</span>\`}} />;`,
          },
          { code: `${button}<Button render={<a />} children={label} />;` },
          { code: `${button}<Button render={<a />} {...props} />;` },
          {
            code: `${button}function Link(props) { return <Button render={<a />} {...props} />; }`,
          },
          { code: `${button}<Button render={<a />} {...{'aria-label': 'Continue'}} />;` },
          { code: `${button}<Button render={<a />} {...{children: 'Continue'}} />;` },
          { code: `${button}<Button render={<a />} {...{...props, children: 'Continue'}} />;` },
          { code: `${button}<Button render={<a />} {...{children: null, ...props}} />;` },
          { code: `${button}<Button render={<a />} {...{children: null}}>Continue</Button>;` },
          {
            code: `${button}const labelProps = {children: 'Continue'}; <Button render={<a />} {...labelProps} />;`,
          },
          { code: `${button}<Button render={<a />} aria-label="Continue" />;` },
          { code: `${button}<Button render={<a />} title="Continue" />;` },
          { code: `${button}<Button render={<a />}>{0}</Button>;` },
          { code: `${button}<Button render={<a />}>{1n}</Button>;` },
          { code: `${button}<Button render={<a />}>{0n}</Button>;` },
          { code: `${button}const total = 1n; <Button render={<a />}>{total}</Button>;` },
          { code: `${button}<Button render={<a />}><span>Continue</span></Button>;` },
          { code: `${button}<Button render={<a />} hidden={null}>Continue</Button>;` },
          {
            code: `${button}<Button render={<a aria-hidden={false} />} aria-hidden="true">Continue</Button>;`,
          },
          { code: `${button}<Button render={<a hidden={false} />} hidden>Continue</Button>;` },
          { code: `${button}<Button render={<a aria-hidden={collapsed} />}>Continue</Button>;` },
          { code: `${button}<Button render={<a />} hidden={collapsed}>Continue</Button>;` },
          {
            code: `${button}const collapsed = false; <Button render={<a />} hidden={collapsed}>Continue</Button>;`,
          },
          {
            code: `${button}const collapsed = false; <Button render={<a />}><span hidden={collapsed}>Continue</span></Button>;`,
          },
          { code: `${button}<Button render={<a />}><span hidden={null}>Continue</span></Button>;` },
          {
            code: `${button}<Button render={<a />}><span hidden={undefined}>Continue</span></Button>;`,
          },
          {
            code: `${button}<Button render={<a />}><span aria-hidden={collapsed}>Continue</span></Button>;`,
          },
          { code: `${button}<Button render={<a />}><Label /></Button>;` },
          { code: `${button}<Button render={<a />}><Icons.Home /></Button>;` },
          {
            code: `${button}function Label() { return <span>Home</span>; } <Button render={<a />}><Label /></Button>;`,
          },
          {
            code: `${button}<Button render={<a />}><><span aria-hidden>Icon</span>Continue</></Button>;`,
          },
          { code: `${button}<Button render={<a />}><img alt="Continue" /></Button>;` },
          { code: `${button}<Button render={<a />}>{[null, 'Continue']}</Button>;` },
          { code: `${button}<Button render={<a />}>{available ? 'Continue' : null}</Button>;` },
          { code: `${button}<Button render={<a />}>{available && 'Continue'}</Button>;` },
          { code: `${button}<Button render={<a />}>{label || 'Continue'}</Button>;` },
          { code: `${button}<Button render={<a />}>{0 && 'Continue'}</Button>;` },
          { code: `${button}<Button render={<a />}>{false || 'Continue'}</Button>;` },
          { code: `${button}<Button render={<a />}>{null ?? 'Continue'}</Button>;` },
          { code: `${button}const label = 'Continue'; <Button render={<a />}>{label}</Button>;` },
          {
            code: `${button}<Button render={<a />}><span hidden={false}>Continue</span></Button>;`,
          },
          { code: `<a>Documentation</a>;` },
          { code: `<a aria-label="Documentation" />;` },
          { code: `<a title="Documentation" />;` },
          { code: `<a children="Documentation" />;` },
          { code: `<a dangerouslySetInnerHTML={{__html: 'Documentation'}} />;` },
          { code: `<a {...props} />;` },
          { code: `<a {...{'aria-label': 'Documentation'}} />;` },
          { code: `${button}<Button render={(props) => <a {...props} />}>Continue</Button>;` },
        ],
        invalid: [
          `${sidebar}<SidebarMenuButton render={<a href="/home" />} />;`,
          `${button}<Button render={<a />}></Button>;`,
          `${button}<Button render={external && <a />} />;`,
          `${button}const link = <a />; <Button render={link} />;`,
          `${button}const link = <a />; <><Button render={link}>Home</Button><Button render={link} /></>;`,
          `${button}const link = <a />; useElsewhere(link); <Button render={link}>Continue</Button>;`,
          `${button}const link = <a />; <Other render={link}>Continue</Other>;`,
          `${button}let link = <a />; link = <span />; <Button render={link}>Continue</Button>;`,
          `${button}<Button render={<a /> && <span />}>Continue</Button>;`,
          `import { Button } from '@base-ui-components/react/button'; <Button render={<a />} />;`,
          `import { Button } from '@workspace/ui/components/button'; <Button render={<a />} />;`,
          `import { Button } from './ui/button.js'; <Button render={<a />} />;`,
          `import { Button } from '@custom/ui/components/button'; <Button render={<a />}>Continue</Button>;`,
          `import { Other } from '@workspace/ui/components/button'; <Other render={<a />}>Continue</Other>;`,
          `${button}<Button render={<a />}>   </Button>;`,
          `${button}<Button render={<a />}>{/* no content */}</Button>;`,
          `${button}<Button render={<a />}>{undefined}</Button>;`,
          `${button}<Button render={<a />}>{null}</Button>;`,
          `${button}<Button render={<a />}>{false}</Button>;`,
          `${button}<Button render={<a />}>{true}</Button>;`,
          `${button}<Button render={<a />}>{''}</Button>;`,
          `${button}<Button render={<a />}>{[]}</Button>;`,
          `${button}<Button render={<a />}>{[null, false, '']}</Button>;`,
          `${button}<Button render={<a />}>{() => 'Continue'}</Button>;`,
          `${button}<Button render={<a />}>{available ? '' : null}</Button>;`,
          `${button}<Button render={<a />}>{available && null}</Button>;`,
          `${button}<Button render={<a />}>{false && 'Continue'}</Button>;`,
          `${button}const visible = false; <Button render={<a />}>{visible && 'Continue'}</Button>;`,
          `${button}const visible = true; <Button render={<a />}>{visible ? null : 'Continue'}</Button>;`,
          `${button}<Button render={<a />}>{true || 'Continue'}</Button>;`,
          `${button}<Button render={<a />}>{false ?? 'Continue'}</Button>;`,
          `${button}<Button render={<a />}>{1 === 1}</Button>;`,
          `${button}<Button render={<a />}>{('Continue', null)}</Button>;`,
          `${button}<Button render={<a />}>{true ? null : 'Continue'}</Button>;`,
          `${button}<Button render={<a />}>{false ? 'Continue' : ''}</Button>;`,
          `${button}<Button render={<a />} alt="Continue" />;`,
          `${button}const label = ''; <Button render={<a />}>{label}</Button>;`,
          `${button}const label = null; <Button render={<a />}>{label}</Button>;`,
          `${button}<Button render={<a />} children="" />;`,
          `${button}<Button render={<a />} dangerouslySetInnerHTML={{__html: ''}} />;`,
          `${button}<Button render={<a />} dangerouslySetInnerHTML={{__html: '<span></span>'}} />;`,
          `${button}<Button render={<a />} dangerouslySetInnerHTML={{__html: '<span aria-hidden="true">Continue</span>'}} />;`,
          `${button}<Button render={<a />} dangerouslySetInnerHTML={{__html: '<span hidden>Continue</span>'}} />;`,
          ...[
            '',
            '<span></span>',
            '<span aria-hidden="true">Continue</span>',
            '<span hidden>Continue</span>',
            '<script>Continue</script>',
            '<style>Continue</style>',
          ].map(
            html =>
              `${button}<Button render={<a />} dangerouslySetInnerHTML={{__html: \`${html}\`}} />;`,
          ),
          `${button}const html = \`<span hidden>Continue</span>\`; <Button render={<a />} dangerouslySetInnerHTML={{__html: html}} />;`,
          `${button}<Button render={<a />} dangerouslySetInnerHTML={{__html: null}} />;`,
          `${button}<Button render={<a />} dangerouslySetInnerHTML={{}} />;`,
          `${button}<Button render={<a />} hidden dangerouslySetInnerHTML={{__html: 'Continue'}} />;`,
          `${button}<Button render={<a />}><span aria-hidden="true" dangerouslySetInnerHTML={{__html: 'Continue'}} /></Button>;`,
          `${button}<Button render={<a />} {...{id: 'link'}} />;`,
          `${button}<Button render={<a />} children="Continue" {...{children: null}} />;`,
          `${button}<Button render={<a />} {...{children: 'Continue'}} children={null} />;`,
          `${button}<Button render={<a />} {...{...props, children: null, dangerouslySetInnerHTML: null, title: '', 'aria-label': '', 'aria-labelledby': ''}} />;`,
          `${button}<Button render={<a />} {...{children: 'Continue', ...{children: null}}} />;`,
          `${button}<Button render={<a />} aria-label="Continue" {...{'aria-label': ''}} />;`,
          `${button}<Button render={<a />} {...{children: ''}} />;`,
          `${button}<Button render={<a />} {...null} />;`,
          `${button}<Button render={<a />} aria-label="" />;`,
          `${button}<Button render={<a />} children="Continue">{null}</Button>;`,
          `${button}<Button render={<a />}><span aria-hidden>Continue</span></Button>;`,
          `${button}<Button render={<a />}><span aria-hidden="true">Continue</span></Button>;`,
          `${button}<Button render={<a />}><span hidden>Continue</span></Button>;`,
          `${button}const collapsed = true; <Button render={<a />}><span aria-hidden={collapsed}>Continue</span></Button>;`,
          `${button}const collapsed = 'true'; <Button render={<a />}><span aria-hidden={collapsed}>Continue</span></Button>;`,
          `${button}const collapsed = true; <Button render={<a />} hidden={collapsed}>Continue</Button>;`,
          `${button}const collapsed = true; <Button render={<a />}><span hidden={collapsed}>Continue</span></Button>;`,
          `${button}<Button render={<a />}><Label aria-hidden="true" /></Button>;`,
          `${button}<Button render={<a />}><Icons.Home hidden /></Button>;`,
          `${button}<Button render={<a />}><span><span aria-hidden>Continue</span></span></Button>;`,
          `${button}<Button render={<a />}><><span aria-hidden>Continue</span></></Button>;`,
          `${button}<Button render={<a />}><span /></Button>;`,
          `${button}<Button render={<a />}><img alt="" /></Button>;`,
          `${button}<Button render={<a />} hidden>Continue</Button>;`,
          `${button}<Button render={<a aria-hidden="true" />}>Continue</Button>;`,
          `${button}<Button render={<a aria-hidden="true" />} aria-hidden={false}>Continue</Button>;`,
          `${button}const collapsed = true; <Button render={<a aria-hidden={collapsed} />}>Continue</Button>;`,
          `${button}<Button render={<a {...{'aria-hidden': true}} />}>Continue</Button>;`,
          `import { Button } from 'other-library'; <Button render={<a />}>Continue</Button>;`,
          `import { Button } from '@custom/ui/button'; <Button render={<a />}>Continue</Button>;`,
          `import { SidebarMenuButton } from '@/custom/sidebar'; <SidebarMenuButton render={<a />}>Continue</SidebarMenuButton>;`,
          `import { Other } from '@/components/ui/sidebar'; <Other render={<a />}>Continue</Other>;`,
          `<Button render={<a />}>Continue</Button>;`,
          `${button}function Example(Button) { return <Button render={<a />}>Continue</Button>; }`,
          `${button}<Button icon={<a />}>Continue</Button>;`,
          `${button}<Button render={<span><a /></span>}>Continue</Button>;`,
          `${button}<Button render={() => <a />}>Continue</Button>;`,
          `${button}<Button render={<a><span aria-hidden>Hidden</span></a>}>Continue</Button>;`,
          `${button}<Button render={((<a />), <span />)}>Continue</Button>;`,
          `<div render={<a />}>Continue</div>;`,
          `<a />;`,
          `<a {...{id: 'documentation'}} />;`,
        ].map(code => ({
          code,
          errors: [
            {
              message:
                'Anchors must have content and the content must be accessible by a screen reader.',
            },
          ],
        })),
      });
    });

    it('ignores non-rendered intrinsic elements when checking accessible content', () => {
      const code = (content: string) => `${button}<Button render={<a />}>${content}</Button>;`;
      new Tester().run('anchor-has-content', rule, {
        valid: [
          ...['script', 'style', 'template'].map(name =>
            code(`<${name}>Hidden</${name}><span>Continue</span>`),
          ),
          ...['Script', 'Style', 'Template'].map(name => code(`<${name} />`)),
        ].map(code => ({ code })),
        invalid: ['script', 'style', 'template']
          .flatMap(name => [
            code(`<${name}>Continue</${name}>`),
            code(`<${name} title="Continue" />`),
            code(`<${name} aria-label="Continue" />`),
            code(`<span><${name}><img alt="Continue" /></${name}></span>`),
          ])
          .map(code => ({ code, errors: 1 })),
      });
    });

    it('allows converging alias paths only when every consumer supplies content', () => {
      const alias = `${button}const link = <a />; const alias = flag ? link : link;`;
      const diamond = `${button}const link = <a />; const left = link; const right = link; const alias = flag ? left : right;`;
      new Tester().run('anchor-has-content', rule, {
        valid: [
          `${alias}<Button render={alias}>Continue</Button>;`,
          `${diamond}<Button render={alias}>Continue</Button>;`,
          `${diamond}<><Button render={alias}>Home</Button><Button render={alias}>Menu</Button></>;`,
        ].map(code => ({ code })),
        invalid: [
          `${alias}<Button render={alias} />;`,
          `${diamond}<><Button render={alias}>Continue</Button><Button render={alias} /></>;`,
          `${diamond}<><Button render={alias}>Continue</Button><Other render={alias}>Continue</Other></>;`,
        ].map(code => ({ code, errors: 1 })),
      });
    });

    it('handles repeated alias paths without accepting empty or cyclic consumers', () => {
      const aliases = Array.from(
        { length: 24 },
        (_, i) => `const link${i + 1} = flag ? link${i} : link${i};`,
      ).join('');
      const code = `${button}const link0 = <a />;${aliases}`;
      new Tester().run('anchor-has-content', rule, {
        valid: [
          `${code}<Button render={link24}>Continue</Button>;`,
          `${code}<><Button render={link24}>Home</Button><Button render={link24}>Menu</Button></>;`,
        ].map(code => ({ code })),
        invalid: [
          `${code}<><Button render={link24}>Home</Button><Button render={link24} /></>;`,
          `${code}<><Button render={link24}>Home</Button><Other render={link24}>Menu</Other></>;`,
          `${button}const link = <a />; const alias = flag ? link : alias; <Button render={alias}>Continue</Button>;`,
          `${button}const link = <a />; const left = flag ? link : right; const right = left; <Button render={right}>Continue</Button>;`,
        ].map(code => ({ code, errors: 1 })),
      });
    });

    it('follows sole plain assignment writes while checking every consumer', () => {
      const assigned = `${button}let link; link = <a />;`;
      new Tester().run('anchor-has-content', rule, {
        valid: [
          `${assigned}<Button render={link}>Continue</Button>;`,
          `${assigned}let alias; alias = link; <Button render={alias}>Continue</Button>;`,
          `${assigned}<><Button render={link}>Home</Button><Button render={link}>Menu</Button></>;`,
          `${button}let link; link = flag ? <a /> : <a />; <Button render={link}>Continue</Button>;`,
        ].map(code => ({ code })),
        invalid: [
          `${assigned}<Button render={link} />;`,
          `${assigned}let alias; alias = link; <Button render={alias} />;`,
          `${assigned}<><Button render={link}>Home</Button><Button render={link} /></>;`,
          `${assigned}<><Button render={link}>Home</Button><Other render={link}>Menu</Other></>;`,
          `${assigned}useElsewhere(link); <Button render={link}>Continue</Button>;`,
          `${button}let link; <Other render={link = <a />} />; <Button render={link}>Continue</Button>;`,
          `${button}let link, other; other = link = <a />; <Button render={link}>Continue</Button>;`,
          `${button}let link; const other = link = <a />; <Button render={link}>Continue</Button>;`,
          `${button}let link; consume(link = <a />); <Button render={link}>Continue</Button>;`,
          `${button}let link; function Example() { return link = <a />; } <Button render={link}>Continue</Button>;`,
          `${assigned}link = <span />; <Button render={link}>Continue</Button>;`,
          `${button}let link; link ||= <a />; <Button render={link}>Continue</Button>;`,
          `${button}let [link] = []; link = <a />; <Button render={link}>Continue</Button>;`,
          `${button}function Example(link) { link = <a />; return <Button render={link}>Continue</Button>; }`,
          `${assigned}const alias = flag ? link : alias; <Button render={alias}>Continue</Button>;`,
        ].map(code => ({ code, errors: 1 })),
      });
    });

    it('resolves accessible-name aliases while preserving unknown values', () => {
      const named = (value: string, name: string) =>
        `${button}const label = ${value}; <Button render={<a />} ${name}={label} />;`;
      new Tester().run('anchor-has-content', rule, {
        valid: [
          ...['aria-label', 'aria-labelledby', 'title'].flatMap(name =>
            ["'Continue'", '`Continue`', '`Go ${destination}`', 'dynamicLabel'].map(value =>
              named(value, name),
            ),
          ),
          `${button}const label = 'Continue'; const alias = label; <Button render={<a />} title={alias} />;`,
          `${button}let label = ''; label = dynamicLabel; <Button render={<a />} aria-label={label} />;`,
          `${button}const label = dynamicLabel; <Button render={<a />} {...{'aria-label': label}} />;`,
          `${button}const label = ''; <Button render={<a />} aria-label={label}>Continue</Button>;`,
          `${button}const label = 'Continue'; <Button render={<a />}><img alt={label} /></Button>;`,
          `${button}<Button render={<a />}><img alt={dynamicLabel} /></Button>;`,
        ].map(code => ({ code })),
        invalid: [
          ...['aria-label', 'aria-labelledby', 'title'].flatMap(name =>
            ["''", "' '", 'null', 'undefined', 'false', 'true', '0', '42', '``', '` `'].map(value =>
              named(value, name),
            ),
          ),
          `${button}const label = ''; const alias = label; <Button render={<a />} title={alias} />;`,
          `${button}let label; label = ''; <Button render={<a />} aria-label={label} />;`,
          `${button}const label = ''; <Button render={<a />} {...{'aria-label': label}} />;`,
          ...["''", "' '", 'null', 'undefined'].map(
            value =>
              `${button}const label = ${value}; <Button render={<a />}><img alt={label} /></Button>;`,
          ),
        ].map(code => ({ code, errors: 1 })),
      });
    });

    it('checks selected HTML branches for accessible content', () => {
      const code = (expression: string, declarations = '') =>
        `${button}${declarations}<Button render={<a />} dangerouslySetInnerHTML={{__html: ${expression}}} />;`;
      new Tester().run('anchor-has-content', rule, {
        valid: [
          "flag ? '<span hidden>Hidden</span>' : '<span>Continue</span>'",
          "true ? '<img alt=\"Continue\">' : ''",
          "false ? '' : '<span>Continue</span>'",
          "flag && '<span>Continue</span>'",
          "'' || '<span>Continue</span>'",
          "null ?? '<span>Continue</span>'",
          "(null, '<span>Continue</span>')",
          "flag ? (other ? '' : '<span>Continue</span>') : ''",
          "flag ? html : '<span>Continue</span>'",
          "flag ?? '<span hidden>Continue</span>'",
          "flag || '<span hidden>Continue</span>'",
        ].map(expression => ({ code: code(expression) })),
        invalid: [
          "flag ? '<span hidden>Continue</span>' : ''",
          "true ? '<span hidden>Continue</span>' : '<span>Continue</span>'",
          "false ? '<span>Continue</span>' : ''",
          'flag && \'<span aria-hidden="true">Continue</span>\'',
          "'' ?? '<span>Continue</span>'",
          "false && '<span>Continue</span>'",
          "'<span hidden>Continue</span>' || '<span>Continue</span>'",
          "null ?? '<span hidden>Continue</span>'",
          "('<span>Continue</span>', '<span hidden>Continue</span>')",
          "flag ? (other ? '<style>Continue</style>' : '') : '<script>Continue</script>'",
        ].map(expression => ({ code: code(expression), errors: 1 })),
      });
      new Tester().run('anchor-has-content', rule, {
        valid: [
          {
            code: code(
              'html',
              "const hidden = '<span hidden>Hidden</span>'; const html = flag ? hidden : '<span>Continue</span>'; ",
            ),
          },
          { code: code('html', "const html = flag ? html : '<span>Continue</span>'; ") },
        ],
        invalid: [
          {
            code: code(
              'html',
              "const hidden = '<span hidden>Continue</span>'; const html = flag ? hidden : ''; ",
            ),
            errors: 1,
          },
          { code: code('html', "const html = flag ? html : ''; "), errors: 1 },
          { code: code('html', 'const html = flag && html; '), errors: 1 },
        ],
      });
    });

    it('distinguishes HTML accessible names from hidden and unnamed markup', () => {
      const code = (html: string) =>
        `${button}<Button render={<a />} dangerouslySetInnerHTML={{__html: ${JSON.stringify(html)}}} />;`;
      new Tester().run('anchor-has-content', rule, {
        valid: [
          '<span title="Continue"></span>',
          '<span aria-label="Continue"></span>',
          '<span aria-labelledby="label"></span>',
          '<span hidden>Hidden</span><img alt="Continue">',
          '<span aria-hidden="false"><img alt="Continue"></span>',
        ].map(html => ({ code: code(html) })),
        invalid: [
          '<span hidden title="Continue"><img alt="Continue"></span>',
          '<span aria-hidden="true" aria-label="Continue"></span>',
          '<script title="Continue">Continue</script>',
          '<style aria-label="Continue">Continue</style>',
          '<template aria-label="Continue"><img alt="Continue"></template>',
          '<span alt="Continue"></span>',
          '<span title=" "><img alt=" "></span><!-- Continue -->',
        ].map(html => ({ code: code(html), errors: 1 })),
      });
    });

    it('preserves computed property and accessor semantics in consumer spreads', () => {
      new Tester().run('anchor-has-content', rule, {
        valid: [
          `${button}const key = 'children'; <Button render={<a />} {...{[key]: 'Continue'}} />;`,
          `${button}<Button render={<a />} {...{['children']: null, ...{children: 'Continue'}}} />;`,
          `${button}<Button render={<a />} {...{[key]: null}} />;`,
          `${button}<Button render={<a />} {...{get children() { return 'Continue'; }}} />;`,
          `${button}<Button render={<a />} {...{children() { return 'Continue'; }}} />;`,
        ].map(code => ({ code })),
        invalid: [
          `${button}const key = 'children'; <Button render={<a />} {...{children: 'Continue', [key]: null}} />;`,
          `${button}<Button render={<a />} {...{['id']: 'link'}} />;`,
          `${button}<Button render={<a />} {...{children: 'Continue', ...{['children']: null}}} />;`,
        ].map(code => ({ code, errors: 1 })),
      });
    });

    it('selects statically known template-literal branches', () => {
      for (const html of [false, true]) {
        const code = (expression: string, declarations = '') =>
          html
            ? `${button}${declarations}<Button render={<a />} dangerouslySetInnerHTML={{__html: ${expression}}} />;`
            : `${button}${declarations}<Button render={<a />}>{${expression}}</Button>;`;
        new Tester().run('anchor-has-content', rule, {
          valid: [
            "`` || 'Continue'",
            "`` ? null : 'Continue'",
            "`Continue` ? 'Go' : null",
            "`Continue` && 'Go'",
            '`Continue` ?? null',
            '`Continue` || null',
            "`${label}` ? 'Continue' : null",
            "`${label}` ?? 'Continue'",
          ].map(expression => ({ code: code(expression) })),
          invalid: [
            "`` ?? 'Continue'",
            "`` ? 'Continue' : null",
            "`` && 'Continue'",
            '`Continue` && null',
            "`Continue` ? null : 'Continue'",
            "` ` || 'Continue'",
            "` ` ?? 'Continue'",
            "` ` ? null : 'Continue'",
          ].map(expression => ({ code: code(expression), errors: 1 })),
        });
        new Tester().run('anchor-has-content', rule, {
          valid: [
            { code: code("label || 'Continue'", 'const label = ``;') },
            { code: code("label ? 'Continue' : null", 'const label = `Continue`;') },
          ],
          invalid: [
            {
              code: code("label ?? 'Continue'", 'const empty = ``; const label = empty;'),
              errors: 1,
            },
            { code: code("label ? 'Continue' : null", 'const label = ``;'), errors: 1 },
          ],
        });
      }
    });

    it('selects the rendered branch and final sequence operand', () => {
      const code = (expression: string) =>
        `${button}<Button render={<a />}>{${expression}}</Button>;`;
      new Tester().run('anchor-has-content', rule, {
        valid: [
          "(null, false, 'Continue')",
          "'Continue' || null",
          "'Continue' ?? null",
          "'Continue' && 'Go'",
          "0 ?? 'Continue'",
          "false ? null : 'Continue'",
          'label || 0',
        ].map(expression => ({ code: code(expression) })),
        invalid: [
          "('Continue', 0, false)",
          "'' ?? 'Continue'",
          "'' && 'Continue'",
          "'Continue' && null",
          "label && ''",
        ].map(expression => ({ code: code(expression), errors: 1 })),
      });
    });
  });
}

describe('S6827 TypeScript render expressions', () => {
  it('unwraps element assertions without accepting unsupported callbacks', () => {
    new NoTypeCheckingRuleTester().run('anchor-has-content', rule, {
      valid: [
        { code: `${button}<Button render={(<a />) as React.ReactElement}>Continue</Button>;` },
        {
          code: `${button}<Button render={(<a />) as unknown as React.ReactElement}>Continue</Button>;`,
        },
        { code: `${button}<Button render={((<a />) as React.ReactElement)!}>Continue</Button>;` },
        {
          code: `${button}<Button render={((<a />) as React.ReactElement) satisfies React.ReactElement}>Continue</Button>;`,
        },
        {
          code: `${button}<Button render={(<a />) satisfies React.ReactElement}>Continue</Button>;`,
        },
        { code: `${button}<Button render={<a />}>{label as string}</Button>;` },
      ],
      invalid: [
        { code: `${button}<Button render={((<a />) as React.ReactElement)!} />;`, errors: 1 },
        { code: `${button}<Button render={((() => <a />) as any)!}>Continue</Button>;`, errors: 1 },
        {
          code: `${button}<Button render={(<a />) as React.ReactElement}>{null as string | null}</Button>;`,
          errors: 1,
        },
        { code: `${button}<Button render={(() => <a />) as any}>Continue</Button>;`, errors: 1 },
        {
          code: `import type { Button } from '@base-ui/react/button'; <Button render={<a />}>Continue</Button>;`,
          errors: 1,
        },
      ],
    });
  });
});
