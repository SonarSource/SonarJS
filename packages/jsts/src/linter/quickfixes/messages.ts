/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
  ['S1537', 'Remove this trailing comma'],
  ['S113', 'Add a new line at the end of file'],
  ['S6749', 'Remove redundant fragment'],
  ['S6859', 'Replace with a relative path'],
  ['S4023', 'Replace with type alias'],
  ['S6637', 'Remove .bind() call'],
  ['S6509', 'Remove extra cast'],
  ['S1116', 'Remove extra semicolon'],
  ['S3257', 'Remove type declaration'],
  ['S6660', "Replace with 'else if'"],
  ['S2966', "Replace with optional chaining '.?'"],
  ['S1131', 'Remove trailing space'],
  ['S6645', 'Remove initialization'],
  ['S4157', 'Remove type argument'],
  ['S4325', 'Remove type assertion'],
  ['S6644', 'Replace with a simpler expression'],
  ['S6650', 'Remove alias'],
  ['S3504', "Replace 'var' with 'let'"],
  ['S3498', 'Use shorthand property'],
  ['S6590', "Replace with 'as const'"],
  ['S3353', "Replace with 'const'"],
  ['S6598', 'Replace with a function type'],
  ['S1488', 'Return value immediately'],
  ['S4156', "Replace with 'namespace' keyword"],
  ['S6653', 'Replace with Object.hasOwn()'],
  ['S6661', 'Replace with object spread syntax'],
  ['S2933', "Add 'readonly'"],
  ['S6565', "Replace return type with 'this'"],
  ['S3512', 'Replace with template string literal'],
  ['S1264', "Replace with 'while' loop"],
  ['S1441', 'Fix quotes'],
  ['S2427', 'Add 10 as radix'],
  ['S1438', 'Add semicolon'],
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
    if (ruleKey === 'no-duplicates' || ruleKey === 'S3863') {
      // TODO  workaround for eslint-plugin-import/no-duplicates, rule doesn't provide message for fix
      return 'Remove this duplicate import';
    }
    throw Error(`Missing message for quick fix '${ruleKey}'`);
  }
  return message;
}
