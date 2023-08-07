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
import { rule } from '@sonar/jsts/rules/xml-parser-xxe';
import { RuleTester } from 'eslint';
import { TypeScriptRuleTester } from '../../../tools';

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
        import * as libxmljs from "libxmljs";
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
    },
    {
      code: `
        const libxmljs = require("libxmljs");
        var xmlDoc = libxmljs.parseXmlString(xml, { noblanks: true, noent: true, nocdata: true });`,
      errors: 1,
    },
    {
      code: `
        import * as libxmljs from "libxmljs";
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

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
const ruleTesterTs = new TypeScriptRuleTester();

ruleTesterJs.run('XML parsers should not be vulnerable to XXE attacks [js]', rule, tests);
ruleTesterTs.run('XML parsers should not be vulnerable to XXE attacks [ts]', rule, tests);
