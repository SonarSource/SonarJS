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
/**
 * A mapping of ESLint rule keys to quick fix messages
 *
 * Since SonarLint quick fixes always include a message,
 * one needs to define a message for every enabled ESLint
 * rule that includes a fix.
 */
const quickFixMessages = new Map<string, string>([
  ['comma-dangle', 'Remove this trailing comma'],
  ['eol-last', 'Add a new line at the end of file'],
  ['jsx-no-useless-fragment', 'Remove redundant fragment'],
  ['no-absolute-path', 'Replace with a relative path'],
  ['no-empty-interface', 'Replace with type alias'],
  ['no-extra-bind', 'Remove .bind() call'],
  ['no-extra-boolean-cast', 'Remove extra cast'],
  ['no-extra-semi', 'Remove extra semicolon'],
  ['no-inferrable-types', 'Remove type declaration'],
  ['no-lonely-if', "Replace with 'else if'"],
  ['no-non-null-assertion', "Replace with optional chaining '.?'"],
  ['no-trailing-spaces', 'Remove trailing space'],
  ['no-undef-init', 'Remove initialization'],
  ['no-unnecessary-type-arguments', 'Remove type argument'],
  ['no-unnecessary-type-assertion', 'Remove type assertion'],
  ['no-unneeded-ternary', 'Replace with a simpler expression'],
  ['no-useless-rename', 'Remove alias'],
  ['no-var', "Replace 'var' with 'let'"],
  ['object-shorthand', 'Use shorthand property'],
  ['prefer-as-const', "Replace with 'as const'"],
  ['prefer-const', "Replace with 'const'"],
  ['prefer-function-type', 'Replace with a function type'],
  ['prefer-immediate-return', 'Return value immediately'],
  ['prefer-namespace-keyword', "Replace with 'namespace' keyword"],
  ['prefer-object-has-own', 'Replace with Object.hasOwn()'],
  ['prefer-object-spread', 'Replace with object spread syntax'],
  ['prefer-readonly', "Add 'readonly'"],
  ['prefer-return-this-type', "Replace return type with 'this'"],
  ['prefer-template', 'Replace with template string literal'],
  ['prefer-while', "Replace with 'while' loop"],
  ['quotes', 'Fix quotes'],
  ['radix', 'Add 10 as radix'],
  ['semi', 'Add semicolon'],
]);

/**
 * Gets the quick fix message for a fixable ESLint rule
 *
 * A fixable ESLint rule here means an ESLint rule that provides
 * a fix that doesn't include a message contrary to suggestions.
 *
 * @param ruleKey the rule key of a fixable ESLint rule
 * @throws a runtime error if there are no corresponding messages
 * @returns the corresponding quick fix message
 */
export function getQuickFixMessage(ruleKey: string): string {
  const message = quickFixMessages.get(ruleKey);
  if (!message) {
    throw Error(`Missing message for quick fix '${ruleKey}'`);
  }
  return message;
}
