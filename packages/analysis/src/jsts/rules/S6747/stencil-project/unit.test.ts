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
import { rule } from '../rule.js';
import { rules as reactRules } from '../../external/react.js';
import { rules as a11yRules } from '../../external/a11y.js';
import { join } from 'node:path/posix';
import { NoTypeCheckingRuleTester } from '../../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe } from 'node:test';

// Sentinel: upstream rules still report JSX attributes that the Stencil opt-out suppresses.
describe('S6747 Stencil upstream sentinel', () => {
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run('React properties in Stencil JSX', reactRules['no-unknown-property'], {
    valid: [],
    invalid: [
      {
        code: `import { h } from '@stencil/core';
<span class="filter-button-wrapper" />;`,
        errors: 1,
        output: `import { h } from '@stencil/core';
<span className="filter-button-wrapper" />;`,
      },
    ],
  });
  ruleTester.run('ARIA properties in Stencil JSX', a11yRules['aria-props'], {
    valid: [],
    invalid: [
      {
        code: `import { h } from '@stencil/core';
<div aria-hiddenn="true" />;`,
        errors: 1,
      },
    ],
  });
});

describe('S6747 Stencil opt-out', () => {
  const dirname = join(import.meta.dirname, 'fixtures');
  process.chdir(dirname);
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run('S6747 skips only files with runtime Stencil imports', rule, {
    valid: [
      {
        code: `import { h } from '@stencil/core';
export const FilterButton = () => <span class="filter-button-wrapper" />;`,
        filename: join(dirname, 'filename.tsx'),
      },
      {
        code: `import { h as createElement } from '@stencil/core';
<div role="separator" tabindex="0" />;`,
        filename: join(dirname, 'filename.tsx'),
      },
      {
        code: `import { Component, Host, h } from '@stencil/core';
<Host><div unknownProperty="value" aria-hiddenn="true" /></Host>;`,
        filename: join(dirname, 'filename.jsx'),
      },
      {
        code: `import { type JSX, h } from '@stencil/core';
<div class="panel" />;`,
        filename: join(dirname, 'filename.tsx'),
      },
      {
        code: `import { Component } from '@stencil/core';
<div class="panel" />;`,
        filename: join(dirname, 'filename.tsx'),
      },
      {
        code: `import * as Stencil from '@stencil/core';
<div class="panel" />;`,
        filename: join(dirname, 'filename.tsx'),
      },
      {
        code: `import '@stencil/core';
<div class="panel" />;`,
        filename: join(dirname, 'filename.jsx'),
      },
      {
        code: `<div class="panel" aria-hiddenn="true" />;
import { h } from '@stencil/core';`,
        filename: join(dirname, 'filename.tsx'),
      },
    ],
    invalid: [
      {
        code: `import React from 'react';
export const Page = () => <span class="page" />;`,
        filename: join(dirname, 'react.tsx'),
        errors: 1,
      },
      {
        code: `<div tabindex="0" />;`,
        filename: join(dirname, 'automatic-react.tsx'),
        errors: 1,
      },
      {
        code: `import type { h } from '@stencil/core';
<div class="panel" />;`,
        filename: join(dirname, 'filename.tsx'),
        errors: 1,
      },
      {
        code: `import { type h, type Component } from '@stencil/core';
<div class="panel" />;`,
        filename: join(dirname, 'filename.tsx'),
        errors: 1,
      },
      {
        code: `import type * as Stencil from '@stencil/core';
<div class="panel" />;`,
        filename: join(dirname, 'filename.tsx'),
        errors: 1,
      },
      {
        code: `import React from 'react';
import { type h as createElement } from '@stencil/core';
<div tabindex="0" />;`,
        filename: join(dirname, 'react.tsx'),
        errors: 1,
      },
      {
        code: `import { h } from '@stencil/core/internal';
<div class="panel" />;`,
        filename: join(dirname, 'filename.tsx'),
        errors: 1,
      },
      {
        code: `import { h } from 'preact';
<div class="panel" />;`,
        filename: join(dirname, 'filename.tsx'),
        errors: 1,
      },
      {
        code: `import React from 'react';
<div aria-hiddenn="true" />;`,
        filename: join(dirname, 'react.tsx'),
        errors: 1,
      },
    ],
  });
});
