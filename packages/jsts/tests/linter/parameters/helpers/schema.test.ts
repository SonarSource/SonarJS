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
import { Rule } from 'eslint';
import { getRuleSchema } from '../../../../src/linter/parameters/helpers';

describe('getRuleSchema', () => {
  it('should return the schema', () => {
    expect(
      getRuleSchema({ meta: { schema: [42] } } as unknown as Rule.RuleModule, 'schema'),
    ).toEqual([42]);
  });

  it('should return undefined on an undefined rule', () => {
    console.log = jest.fn();
    expect(getRuleSchema(undefined, 'undefined-rule')).toBeUndefined();
    expect(console.log).toHaveBeenCalledWith(`DEBUG ruleModule not found for rule undefined-rule`);
  });

  it('should return undefined on a meta-less rule', () => {
    expect(getRuleSchema({ meta: undefined } as Rule.RuleModule, 'meta-less')).toBeUndefined();
  });

  it('should return undefined on a schema-less rule', () => {
    expect(
      getRuleSchema({ meta: { schema: undefined } } as Rule.RuleModule, 'schema-less'),
    ).toBeUndefined();
  });
});
