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
import { rule } from './index.js';
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S2755', () => {
  it('S2755', () => {
    const tests = {
      valid: [
        {
          code: `
        const libxmljs = require("libxmljs");
        var xmlDoc = libxmljs.parseXml(xml, { noblanks: true, nocdata: true });`,
        },
        {
          code: `
        const libxmljs = require("libxmljs");
        var xmlDoc = libxmljs.parseXmlString(xml, { noblanks: true, nocdata: true });`,
        },
        {
          code: `
        const libxmljs = require("libxmljs");
        var xmlDoc = libxmljs.parseXmlString(xml, { noblanks: true, noent: false, nocdata: true });`,
        },
        {
          code: `
        import libxmljs from "libxmljs";
        var xmlDoc = libxmljs.parseXmlString(xml, { noblanks: true, nocdata: true });`,
        },
        {
          code: `
        import { parseXmlString } from "libxmljs";
        var xmlDoc = parseXmlString(xml, { noblanks: true, noent: false, nocdata: true });`,
        },
        {
          code: `
        var xmlDoc = parseXmlString(xml, { noblanks: true, noent: true, nocdata: true });`,
        },
        {
          code: `
        const libxmljs = require("libxmljs");
        var xmlDoc = libxmljs.parseXmlString({ noblanks: true, noent: true, nocdata: true });`,
          errors: 1,
        },
      ],
      invalid: [
        {
          code: `
        const libxmljs = require("libxmljs");
        var xmlDoc = libxmljs.parseXml(xml, { noblanks: true, noent: true, nocdata: true });`,
          errors: [
            {
              message:
                '{"message":"Disable access to external entities in XML parsing.","secondaryLocations":[{"column":21,"line":3,"endColumn":38,"endLine":3}]}',
              line: 3,
              endLine: 3,
              column: 63,
              endColumn: 74,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
        const libxmljs = require("libxmljs");
        var xmlDoc = libxmljs.parseXmlString(xml, { noblanks: true, noent: true, nocdata: true });`,
          errors: 1,
        },
        {
          code: `
        import libxmljs from "libxmljs";
        var xmlDoc = libxmljs.parseXmlString(xml, { noblanks: true, noent: true, nocdata: true });`,
          errors: 1,
        },
        {
          code: `
        import { parseXmlString } from "libxmljs";
        var xmlDoc = parseXmlString(xml, { noblanks: true, noent: true, nocdata: true });`,
          errors: 1,
        },
      ],
    };

    const ruleTesterJs = new RuleTester();
    const ruleTesterTs = new RuleTester();

    ruleTesterJs.run('XML parsers should not be vulnerable to XXE attacks [js]', rule, tests);
    ruleTesterTs.run('XML parsers should not be vulnerable to XXE attacks [ts]', rule, tests);
  });
});
