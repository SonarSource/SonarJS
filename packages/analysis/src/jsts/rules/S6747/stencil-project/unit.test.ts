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
import { join } from 'node:path/posix';
import { NoTypeCheckingRuleTester } from '../../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe } from 'node:test';

describe('S6747 Stencil opt-out', () => {
  const dirname = join(import.meta.dirname, 'fixtures');
  process.chdir(dirname);
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run('S6747 skips files using the Stencil runtime', rule, {
    valid: [
      {
        code: `/** @jsxImportSource @stencil/core */
/** @jsxRuntime classic */
/** @jsxRuntime automatic */
export const View = () => <div class="panel" />;`,
        filename: join(dirname, 'automatic-stencil.tsx'),
      },
      {
        code: `/** @jsxImportSource @stencil/core */
/** @jsxRuntime classic */
import { h } from '@stencil/core';
export const View = () => <div class="panel" />;`,
        filename: join(dirname, 'classic-stencil.tsx'),
      },
      {
        code: `/** @jsxImportSource @stencil/core @jsxImportSource react */
export const View = () => <div class="panel" />;`,
        filename: join(dirname, 'automatic-stencil.tsx'),
      },
      {
        code: `/** @jsxImportSource @stencil/core */
export const Icon = () => <svg class="icon" />;`,
        filename: join(dirname, 'automatic-stencil.tsx'),
      },
      {
        code: `/**
 * @jsxImportSource @stencil/core
 */
import type { JSX } from '@stencil/core';
<div tabindex="0" />;`,
        filename: join(dirname, 'automatic-stencil.tsx'),
      },
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
        code: `/** @jsxImportSource @stencil/core */
/** @jsxRuntime classic */
import React from 'react';
export const View = () => <div class="panel" />;`,
        filename: join(dirname, 'classic-react.tsx'),
        errors: 1,
      },
      {
        code: `/** @jsxImportSource @stencil/core */
/** @jsxRuntime automatic */
/** @jsxRuntime classic */
import React from 'react';
export const View = () => <div class="panel" />;`,
        filename: join(dirname, 'classic-react.tsx'),
        errors: 1,
      },
      {
        code: `/** @jsxImportSource react @jsxImportSource @stencil/core */
export const View = () => <div class="panel" />;`,
        filename: join(dirname, 'automatic-react.tsx'),
        errors: 1,
      },
      {
        code: `/** @jsxRuntime automatic @jsxImportSource @stencil/core */
export const View = () => <div class="panel" />;`,
        filename: join(dirname, 'automatic-react.tsx'),
        errors: 1,
      },
      {
        code: `/** @jsxImportSource react */
<div class="panel" />;`,
        filename: join(dirname, 'automatic-react.tsx'),
        errors: 1,
      },
      {
        code: `/** @jsxImportSource @stencil/core-other */
<div class="panel" />;`,
        filename: join(dirname, 'automatic-react.tsx'),
        errors: 1,
      },
      {
        code: `const example = '/** @jsxImportSource @stencil/core */';
<div class="panel" />;`,
        filename: join(dirname, 'automatic-react.tsx'),
        errors: 1,
      },
      {
        code: `// @jsxImportSource @stencil/core
<div class="panel" />;`,
        filename: join(dirname, 'automatic-react.tsx'),
        errors: 1,
      },
      {
        code: `import React from 'react';
/** @jsxImportSource @stencil/core */
<div class="panel" />;`,
        filename: join(dirname, 'react.tsx'),
        errors: 1,
      },
      {
        code: `/**
 * @jsxImportSource @stencil/core
 * @jsxImportSource react
 */
<div class="panel" />;`,
        filename: join(dirname, 'automatic-react.tsx'),
        errors: 1,
      },
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
