/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://sonarsource.github.io/rspec/#/rspec/S6853/javascript

import { rules } from 'eslint-plugin-jsx-a11y';
import { interceptReport } from '../helpers';
import { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/experimental-utils';

const labelRule = rules['label-has-associated-control'];

export const rule = decorate(labelRule);

function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, (context, reportDescriptor) => {
    const node = (reportDescriptor as any).node as TSESTree.JSXOpeningElement;
    const parent = node.parent as TSESTree.JSXElement;
    if (parent.children != undefined) {
      for (const child of parent.children) {
        if (child.type === 'JSXElement' && isCustomComponent(child)) {
          // we ignore the issue
          return;
        }
      }
    }
    context.report(reportDescriptor);
  });
}

const KNOWN_HTML_TAGS: Record<string, boolean> = createHtmlTagsRecord();

function isCustomComponent(node: TSESTree.JSXElement) {
  return !KNOWN_HTML_TAGS[(node.openingElement.name as any).name];
}

function createHtmlTagsRecord() {
  const KNOWN_HTML_TAGS = [
    'a',
    'area',
    'abbr',
    'address',
    'article',
    'aside',
    'audio',
    'b',
    'base',
    'blockquote',
    'body',
    'br',
    'button',
    'canvas',
    'caption',
    'cite',
    'code',
    'col',
    'colgroup',
    'data',
    'datalist',
    'dd',
    'del',
    'details',
    'dfn',
    'dialog',
    'div',
    'dl',
    'dt',
    'em',
    'embed',
    'fieldset',
    'figcaption',
    'figure',
    'footer',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'head',
    'header',
    'hgroup',
    'hr',
    'i',
    'iframe',
    'img',
    'input',
    'ins',
    'kbd',
    'label',
    'legend',
    'li',
    'link',
    'main',
    'map',
    'mark',
    'menu',
    'meta',
    'meter',
    'nav',
    'noscript',
    'object',
    'ol',
    'optgroup',
    'option',
    'output',
    'p',
    'param',
    'picture',
    'pre',
    'progress',
    'q',
    'rp',
    'rt',
    'ruby',
    's',
    'samp',
    'script',
    'search',
    'section',
    'select',
    'small',
    'source',
    'span',
    'strong',
    'style',
    'sub',
    'summary',
    'sup',
    'svg',
    'table',
    'tbody',
    'td',
    'template',
    'textarea',
    'tfoot',
    'th',
    'thead',
    'time',
    'title',
    'tr',
    'track',
    'u',
    'ul',
    'var',
    'video',
    'wbr',
  ];
  const map: Record<string, boolean> = {};
  for (const tag of KNOWN_HTML_TAGS) {
    map[tag] = true;
  }
  return map;
}
