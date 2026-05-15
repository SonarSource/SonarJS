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
import { rule } from './rule.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import { DEFAULT_FORMAT } from './config.js';

const ruleTester = new NoTypeCheckingRuleTester();

const CUSTOM_FORMAT = '^[_a-z][a-zA-Z0-9]*$';
const TYPESCRIPT_FILENAME = 'file.ts';

describe('S119', () => {
  it('S119', () => {
    ruleTester.run('Type parameter names should comply with a naming convention', rule, {
      valid: [
        {
          filename: TYPESCRIPT_FILENAME,
          code: `
        class CacheEntry<EntryType> {
          value: EntryType;
        }

        interface Repository<Item> {
          get(): Item;
        }

        type ApiResponse<ResultData> = { data: ResultData };
        type Alias<MyParam> = MyParam | null;
        `,
        },
        {
          filename: TYPESCRIPT_FILENAME,
          code: `
        function mapValue<MappedType>(
          value: string,
          transform: (input: string) => MappedType,
        ): MappedType {
          return transform(value);
        }

        const createPair = <LeftValue, RightValue>(
          left: LeftValue,
          right: RightValue,
        ): [LeftValue, RightValue] => [left, right];
        `,
        },
        {
          filename: TYPESCRIPT_FILENAME,
          code: `
        class EventBus<Event1, HandlerType> {}
        type Dictionary<K extends string, V = string> = Record<K, V>;
        function tuple<const Items extends readonly unknown[]>(items: Items): Items {
          return items;
        }
        type PickValues<Source> = { [Property in keyof Source]: Source[Property] };
        type ExtractValue<Source> = Source extends Promise<infer Value> ? Value : Source;
        interface Box {
          get<Item>(): Item;
          map<T, Result>(value: T, transform: (value: T) => Result): Result;
        }
        `,
        },
        {
          filename: TYPESCRIPT_FILENAME,
          code: `
        type Nullable<item> = item | null;
        const identity = <_value>(value: _value): _value => value;
        `,
          options: [{ format: CUSTOM_FORMAT }],
        },
        {
          filename: TYPESCRIPT_FILENAME,
          code: `
        const value: Promise<result_data> = getValue();
        type UsesOnly = Map<key, value>;
        type Extracted = Promise<value_type>;
        `,
        },
        {
          filename: TYPESCRIPT_FILENAME,
          code: `
        type PickValues<Source> = { [property_name in keyof Source]: Source[property_name] };
        type Dictionary = { [key in string]?: string };
        `,
        },
      ],
      invalid: [
        {
          filename: TYPESCRIPT_FILENAME,
          code: `
        class CacheEntry<entry_type> {
          value: entry_type;
        }
        `,
          errors: [
            {
              message: `Rename this type parameter name to match the regular expression ${DEFAULT_FORMAT}.`,
              line: 2,
              endLine: 2,
              column: 26,
              endColumn: 36,
            },
          ],
        },
        {
          filename: TYPESCRIPT_FILENAME,
          code: `
        interface Repository<item> {
          get(): item;
        }

        type ApiResponse<result_data> = { data: result_data };
        `,
          errors: [error(), error()],
        },
        {
          filename: TYPESCRIPT_FILENAME,
          code: `
        function mapValue<mappedType>(
          value: string,
          transform: (input: string) => mappedType,
        ): mappedType {
          return transform(value);
        }
        `,
          errors: [error()],
        },
        {
          filename: TYPESCRIPT_FILENAME,
          code: `
        const createPair = <leftValue, rightValue>(
          left: leftValue,
          right: rightValue,
        ): [leftValue, rightValue] => [left, right];
        `,
          errors: [error(), error()],
        },
        {
          filename: TYPESCRIPT_FILENAME,
          code: `
        class EventBus<event_1, handlerType> {}
        type AppProps<_Data = unknown, T = unknown> = Context<T>;
        type ExtractValue<Source> = Source extends Promise<infer value_type> ? value_type : Source;
        interface Box {
          get<item>(): item;
        }
        type Constrained<item extends string = string> = item;
        function tuple<const items extends readonly unknown[]>(value: items): items {
          return value;
        }
        `,
          errors: [error(), error(), error(), error(), error(), error(), error()],
        },
        {
          filename: TYPESCRIPT_FILENAME,
          code: `
        type Lowercase<ValidName> = ValidName;
        type Uppercase<Item> = Item;
        `,
          options: [{ format: CUSTOM_FORMAT }],
          errors: [
            {
              message: `Rename this type parameter name to match the regular expression ${CUSTOM_FORMAT}.`,
            },
            {
              message: `Rename this type parameter name to match the regular expression ${CUSTOM_FORMAT}.`,
            },
          ],
        },
      ],
    });
  });
});

function error() {
  return {
    messageId: 'renameTypeParameter',
  };
}
