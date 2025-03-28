/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S1313', () => {
  it('S1313', () => {
    const ruleTesterTs = new DefaultParserRuleTester();

    ruleTesterTs.run('Hardcoded ip addresses should be avoided', rule, {
      valid: [
        {
          code: `
      address = "127.0.0.0";
      address = "::ffff:0:127.0.0.0";
      address = "127.0.255.0";
      address = "255.255.255.255";
      address = "2.5.1.1";
      address = "0.0.0.0";
      address = "0.00.0.0";
      address = "0.0.0.0:8080";
      address = "1.2.03.4";
      address = "[1.1.1.1]";
      address = "0177.0000.0000.0001";
      address = "7f.00.00.01";
      address = "::1";
      address = "0:0:0:0:0:0:0:1";
      address = "::1/128";
      address = "::";
      address = "0:0:0:0:0:0:0:0";
      address = 42,
      address = "192.0.2.5",
      address = "198.51.100.5",
      address = "::ffff:0:198.51.100.5",
      address = "203.0.113.5",
      address = "2001:db8:acad:1::ff"`,
        },
      ],
      invalid: [
        {
          code: `address = "192.168.12.42";`,
          errors: [
            {
              message: 'Make sure using a hardcoded IP address 192.168.12.42 is safe here.',
              line: 1,
              column: 11,
              endLine: 1,
              endColumn: 26,
            },
          ],
        },
        {
          code: `address = "2001:0db8:3c4d:0015:0000:0000:1a2f:1a2b";`,
          errors: 1,
        },
        {
          code: `address = "0012.0012.0012.0001";`,
          errors: 1,
        },
        {
          code: `address = "0xa.0xa.0xa.0x1";`,
          errors: 1,
        },
        {
          code: `address = "10.10.10.1/32";`,
          errors: 1,
        },
        {
          code: `address = "::ffff:0:10.10.10.1";`,
          errors: 1,
        },
      ],
    });
  });
});
