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
import { NOT_A_COMPONENT_MESSAGE } from './rule.js';
import { describe, it } from 'node:test';

const ruleTester = new NoTypeCheckingRuleTester();

describe('S6440', () => {
  it('should not flag hooks in underscore-prefixed components typed as FC', () => {
    ruleTester.run('S6440', rule, {
      valid: [
        {
          // FC<Props> with underscore prefix
          code: `
import { useState, useEffect, type FC } from 'react';
interface Props { name: string; }
const _Message: FC<Props> = (props) => {
  const [value, setValue] = useState(0);
  useEffect(() => { console.log(value); }, [value]);
  return <div>{props.name}</div>;
};
          `,
        },
        {
          // React.FC<Props> with underscore prefix
          code: `
import React, { useState } from 'react';
interface PanelProps { title: string; }
const _Panel: React.FC<PanelProps> = ({ title }) => {
  const [open, setOpen] = useState(false);
  return <div><h2>{title}</h2></div>;
};
          `,
        },
        {
          // FunctionComponent with underscore prefix
          code: `
import { useState, type FunctionComponent } from 'react';
interface SidebarProps { items: string[]; }
const _Sidebar: FunctionComponent<SidebarProps> = ({ items }) => {
  const [selected, setSelected] = useState(0);
  return <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
};
          `,
        },
        {
          // React.FunctionComponent with underscore prefix
          code: `
import React, { useEffect, useState } from 'react';
const _Header: React.FunctionComponent<{ label: string }> = ({ label }) => {
  const [count, setCount] = useState(0);
  useEffect(() => { document.title = label; }, [label]);
  return <header>{label} ({count})</header>;
};
          `,
        },
        {
          // FC-typed component wrapped with React.memo
          code: `
import React, { useState, useCallback, type FC } from 'react';
interface CardProps { title: string; content: string; }
const _Card: FC<CardProps> = ({ title, content }) => {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded(prev => !prev), []);
  return <div><h3 onClick={toggle}>{title}</h3>{expanded && <p>{content}</p>}</div>;
};
export const Card = React.memo(_Card);
          `,
        },
      ],
      invalid: [],
    });
  });

  it('should still flag hooks in non-component functions without FC type', () => {
    ruleTester.run('S6440', rule, {
      valid: [],
      invalid: [
        {
          // Underscore-prefixed function without FC type annotation
          code: `
import { useState } from 'react';
const _helper = () => {
  const [val, setVal] = useState(0);
  return val;
};
          `,
          errors: 1,
        },
        {
          // Non-PascalCase function without type annotation
          code: `
import { useState } from 'react';
function getState() {
  const [val, setVal] = useState(0);
  return val;
}
          `,
          errors: 1,
        },
      ],
    });
  });

  it('should still flag conditional hooks in FC-typed components', () => {
    ruleTester.run('S6440', rule, {
      valid: [],
      invalid: [
        {
          code: `
import { useState, useEffect, type FC } from 'react';
const MyComponent: FC<{ flag: boolean }> = ({ flag }) => {
  const [val, setVal] = useState(0);
  if (flag) {
    useEffect(() => { console.log(val); }, [val]);
  }
  return <div>{val}</div>;
};
          `,
          errors: 1,
        },
      ],
    });
  });

  it('should verify upstream message contains expected text', () => {
    ruleTester.run('S6440', rule, {
      valid: [],
      invalid: [
        {
          code: `
import { useState } from 'react';
const _notAComponent = () => {
  const [val, setVal] = useState(0);
  return val;
};
          `,
          errors: [
            {
              message: new RegExp(NOT_A_COMPONENT_MESSAGE),
            },
          ],
        },
      ],
    });
  });
});
