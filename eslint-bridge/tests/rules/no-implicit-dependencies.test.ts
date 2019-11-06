/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import { RuleTester } from "eslint";
import { rule } from "../../src/rules/no-implicit-dependencies";
import * as path from "path";

const filename = path.join(__dirname, "../fixtures/package-json-project/file.js");
const options = [];

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: { ecmaVersion: 2018, sourceType: "module" },
});

ruleTester.run("Dependencies should be explicit", rule, {
  valid: [
    {
      code: `import * as fs from "fs";`,
      filename,
      options,
    },
    {
      code: `import * as ts from "devDependency";`,
      filename,
      options,
    },
    {
      code: `import "peerDependency";`,
      filename,
      options,
    },
    {
      code: `import "dependency";`,
      filename,
      options,
    },
    {
      code: `import "@namespaced/dependency";`,
      filename,
      options,
    },
    {
      code: `import "whitelist";`,
      filename,
      options: ["whitelist"],
    },
    {
      code: `import "@whitelist/dependency";`,
      filename,
      options: ["@whitelist/dependency"],
    },
    {
      code: `import "./relative";`,
      filename,
      options,
    },
    {
      code: `import * as n from 1;`,
      filename,
      options,
    },

    {
      code: `const fs = require("fs");`,
      filename,
      options,
    },
    {
      code: `const foo = require("foo", "bar");`,
      filename,
      options,
    },
    {
      code: `import "dependency";`,
      filename: path.join(__dirname, "../fixtures/bom-package-json-project/file.js"),
      options,
    },
  ],
  invalid: [
    {
      code: `import "foo";`,
      filename,
      options,
      errors: [
        {
          message: "Either remove this import or add it as a dependency.",
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 7,
        },
      ],
    },
    {
      code: `let foo = require("foo");`,
      filename,
      options,
      errors: [
        {
          message: "Either remove this import or add it as a dependency.",
          line: 1,
          endLine: 1,
          column: 11,
          endColumn: 18,
        },
      ],
    },
    {
      code: `import "foo/bar";`,
      filename,
      options,
      errors: 1,
    },
    {
      code: `import "foo";`,
      filename: path.join(__dirname, "../fixtures/empty-package-json-project/file.js"),
      options,
      errors: 1,
    },
    {
      code: `import "foo";`,
      filename: path.join(__dirname, "../fixtures/package-json-project/dir/subdir/file.js"),
      options,
      errors: 1,
    },
    {
      code: `import "foo";`,
      filename: "/",
      options,
      errors: 1,
    },
  ],
});
