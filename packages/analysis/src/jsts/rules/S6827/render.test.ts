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
          { code: `${button}<Button render={<a />} children="Continue" />;` },
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
          { code: `${button}<Button render={<a />}><span>Continue</span></Button>;` },
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
          `${button}<Button render={<a />} {...{id: 'link'}} />;`,
          `${button}<Button render={<a />} children="Continue" {...{children: null}} />;`,
          `${button}<Button render={<a />} {...{children: 'Continue'}} children={null} />;`,
          `${button}<Button render={<a />} {...{...props, children: null, title: '', 'aria-label': '', 'aria-labelledby': ''}} />;`,
          `${button}<Button render={<a />} {...{children: 'Continue', ...{children: null}}} />;`,
          `${button}<Button render={<a />} aria-label="Continue" {...{'aria-label': ''}} />;`,
          `${button}<Button render={<a />} {...{children: ''}} />;`,
          `${button}<Button render={<a />} {...null} />;`,
          `${button}<Button render={<a />} aria-label="" />;`,
          `${button}<Button render={<a />} children="Continue">{null}</Button>;`,
          `${button}<Button render={<a />}><span aria-hidden>Continue</span></Button>;`,
          `${button}<Button render={<a />}><span aria-hidden="true">Continue</span></Button>;`,
          `${button}<Button render={<a />}><span hidden>Continue</span></Button>;`,
          `${button}<Button render={<a />}><Label aria-hidden="true" /></Button>;`,
          `${button}<Button render={<a />}><Icons.Home hidden /></Button>;`,
          `${button}<Button render={<a />}><span><span aria-hidden>Continue</span></span></Button>;`,
          `${button}<Button render={<a />}><><span aria-hidden>Continue</span></></Button>;`,
          `${button}<Button render={<a />}><span /></Button>;`,
          `${button}<Button render={<a />}><img alt="" /></Button>;`,
          `${button}<Button render={<a />} hidden>Continue</Button>;`,
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
  });
}

describe('S6827 TypeScript render expressions', () => {
  it('unwraps element assertions without accepting unsupported callbacks', () => {
    new NoTypeCheckingRuleTester().run('anchor-has-content', rule, {
      valid: [
        { code: `${button}<Button render={(<a />) as React.ReactElement}>Continue</Button>;` },
        {
          code: `${button}<Button render={(<a />) satisfies React.ReactElement}>Continue</Button>;`,
        },
        { code: `${button}<Button render={<a />}>{label as string}</Button>;` },
      ],
      invalid: [
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
