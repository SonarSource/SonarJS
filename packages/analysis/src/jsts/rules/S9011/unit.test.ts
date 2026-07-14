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
import {
  DefaultParserRuleTester,
  NoTypeCheckingRuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { describe, it } from 'node:test';
import parser from 'vue-eslint-parser';

describe('S9011', () => {
  it('React', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('Rule S9011 - React', rule, {
      valid: [
        { code: `const b = <button type="submit">Search</button>;` },
        { code: `const b = <button type="button">Clear</button>;` },
        { code: `const b = <button type="reset">Reset</button>;` },
        {
          // ternary of two valid literals is fully analyzable and considered compliant
          code: `const b = <button type={isSubmit ? 'submit' : 'button'}>Go</button>;`,
        },
        {
          // dynamic type expression: can't be judged statically, must not be reported
          code: `const b = <button type={computedType}>Go</button>;`,
        },
        {
          code: `React.createElement('button', { type: 'submit' });`,
        },
        {
          // not a button
          code: `const d = <div>Search</div>;`,
        },
        {
          // real-world pattern: search form with an explicitly-typed submit button
          // and a same-form "clear" button explicitly typed as "button"
          code: `
function SearchForm({ onSearch, onClear }) {
  return (
    <form onSubmit={onSearch}>
      <input type="text" name="q" />
      <button type="submit">Search</button>
      <button type="button" onClick={onClear}>Clear</button>
    </form>
  );
}`,
        },
        {
          // real-world pattern: dialog footer button with a dynamic className
          // but a static, valid type
          code: `
function ModalFooter({ isSaving, onSave }) {
  return (
    <button type="submit" className={isSaving ? 'btn-loading' : 'btn'} disabled={isSaving} onClick={onSave}>
      Save
    </button>
  );
}`,
        },
      ],
      invalid: [
        {
          code: `const b = <button>Search</button>;`,
          errors: [{ message: 'Add an explicit "type" attribute to this button.' }],
        },
        {
          code: `React.createElement('button', {});`,
          errors: [{ message: 'Add an explicit "type" attribute to this button.' }],
        },
        {
          code: `const b = <button type="action">Save</button>;`,
          errors: [
            {
              message:
                'Replace this invalid "type" value "action" with one of "button", "submit", or "reset".',
            },
          ],
        },
        {
          // ternary with one invalid literal branch is still statically analyzable
          code: `const b = <button type={isSubmit ? 'submit' : 'action'}>Go</button>;`,
          errors: [
            {
              message:
                'Replace this invalid "type" value "action" with one of "button", "submit", or "reset".',
            },
          ],
        },
        {
          // real-world pattern: icon-only toolbar button with a click handler, no type
          code: `
function ToolbarButton({ onClick, icon, title }) {
  return (
    <button className="toolbar-button" onClick={onClick} title={title}>
      <Icon path={icon} size={0.72} />
    </button>
  );
}`,
          errors: [{ message: 'Add an explicit "type" attribute to this button.' }],
        },
        {
          // real-world pattern: two conditionally-rendered button variants (a play/pause
          // toggle), neither one typed
          code: `
function PlayPauseButton({ playing, canPlay, canInteract, onPlay, onPause }) {
  return playing
    ? <button onClick={onPause} disabled={!canInteract}><Icon name="pause" /></button>
    : <button onClick={onPlay} disabled={!canPlay}><Icon name="play" /></button>;
}`,
          errors: [
            { message: 'Add an explicit "type" attribute to this button.' },
            { message: 'Add an explicit "type" attribute to this button.' },
          ],
        },
        {
          // real-world pattern: list of buttons rendered from an array (e.g. pagination),
          // none of them typed
          code: `
function Pagination({ pages, onSelect }) {
  return (
    <div className="pagination">
      {pages.map(page => (
        <button key={page} className="page-link" onClick={() => onSelect(page)}>
          {page}
        </button>
      ))}
    </div>
  );
}`,
          errors: [{ message: 'Add an explicit "type" attribute to this button.' }],
        },
      ],
    });
  });

  it('Vue', () => {
    const ruleTester = new NoTypeCheckingRuleTester({ parser });

    ruleTester.run('Rule S9011 - Vue', rule, {
      valid: [
        {
          code: `<template><button type="submit">Search</button></template>`,
        },
        {
          code: `<template><button type="button">Clear</button></template>`,
        },
        {
          // bound dynamic type with a real expression: can't be judged statically
          code: `<template><button :type="computedType">Go</button></template>`,
        },
        {
          code: `<template><div>Search</div></template>`,
        },
        {
          // real-world pattern: view-mode tab toggle group, each button explicitly typed
          code: `
<template>
  <div class="tabs">
    <button type="button" :class="{ active: viewMode === 'report' }" @click="setViewMode('report')">Report</button>
    <button type="button" :class="{ active: viewMode === 'graph' }" @click="setViewMode('graph')">Graph</button>
  </div>
</template>`,
        },
        {
          // real-world pattern: bound type from a ternary of literals - both branches
          // are valid types, so this is compliant even though eslint-plugin-vue's own
          // directive check never inspects the bound expression's contents
          code: `<template><button :type="isSubmit ? 'submit' : 'button'" @click="handleClick">{{ label }}</button></template>`,
        },
      ],
      invalid: [
        {
          code: `<template><button>Search</button></template>`,
          errors: [{ message: 'Add an explicit "type" attribute to this button.' }],
        },
        {
          code: `<template><button type="">Search</button></template>`,
          errors: [{ message: 'Add an explicit "type" attribute to this button.' }],
        },
        {
          code: `<template><button :type="">Search</button></template>`,
          errors: [{ message: 'Add an explicit "type" attribute to this button.' }],
        },
        {
          code: `<template><button type="action">Save</button></template>`,
          errors: [
            {
              message:
                'Replace this invalid "type" value "action" with one of "button", "submit", or "reset".',
            },
          ],
        },
        {
          // bound type is a string literal: eslint-plugin-vue's own check never
          // inspects it, so we evaluate it ourselves
          code: `<template><button :type="'action'">Save</button></template>`,
          errors: [
            {
              message:
                'Replace this invalid "type" value "action" with one of "button", "submit", or "reset".',
            },
          ],
        },
        {
          // ternary with one invalid literal branch is still statically analyzable
          code: `<template><button :type="isSubmit ? 'submit' : 'action'">Go</button></template>`,
          errors: [
            {
              message:
                'Replace this invalid "type" value "action" with one of "button", "submit", or "reset".',
            },
          ],
        },
        {
          // real-world pattern: icon-only button component using a slot, no type
          code: `
<template>
  <button :aria-label="title" role="button" :disabled="disabled" class="icon-button">
    <slot />
  </button>
</template>`,
          errors: [{ message: 'Add an explicit "type" attribute to this button.' }],
        },
        {
          // real-world pattern: v-for rendered action buttons, none of them typed
          code: `
<template>
  <ul class="filters">
    <li v-for="tag in tags" :key="tag.id">
      <button @click="toggleTag(tag)">{{ tag.name }}</button>
    </li>
  </ul>
</template>`,
          errors: [{ message: 'Add an explicit "type" attribute to this button.' }],
        },
      ],
    });
  });
});
