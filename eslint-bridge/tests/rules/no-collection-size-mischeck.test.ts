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
import { rule } from "../../src/rules/no-collection-size-mischeck";
import Ruler from "../Ruler";

const ruler = new Ruler();
ruler.run("Collection sizes and array length comparisons should make sense", rule, {
  js: {
    valid: [
      {
        code: `
        if (collections.length < 1)    {}
        if (collections.length > 0)    {}
        if (collections.length <= 1)   {}
        if (collections.length >= 1)   {}
        if (collections.length < 50)   {}
        if (collections.length < 5 + 0){}
        if (collections.size() >= 0)   {}
        `,
      },
    ],
    invalid: [
      {
        code: `if (collection.size < 0) {}`,
        errors: [
          {
            message: `Fix this expression; size of "collection" is always greater or equal to zero.`,
            line: 1,
            endLine: 1,
            column: 5,
            endColumn: 24,
          },
        ],
      },
      {
        code: `if (collection.length < 0) {}`,
        errors: 1,
      },
      {
        code: `if (collection.length >= 0) {}`,
        errors: 1,
      },
    ],
  },
  ts: {
    valid: [
      {
        code: `
        const arr = [];
        if (arr.length < 1)  {}
        if (arr.length > 0)  {}
        if (arr.length <= 1) {}
        if (arr.length >= 1) {}
        if (arr.length < 50) {}
        if (arr.length < 5 + 0) {}
        `,
      },
      {
        code: `
        const obj = {length: -4, size: -5, foobar: 42};
        if (obj.foobar >= 0) {}
        if (obj.size >= 0)   {}
        if (obj.length >= 0) {}
        if (obj.length < 0)  {}
        if (obj.length < 53) {}
        if (obj.length > 0)  {}
        `,
      },
    ],
    invalid: [
      {
        code: `
        const arr = [];
        if (arr.length < 0) {}
        `,
        errors: [
          {
            message: `Fix this expression; length of "arr" is always greater or equal to zero.`,
            line: 3,
            endLine: 3,
            column: 13,
            endColumn: 27,
          },
        ],
      },
      {
        code: `
        const arr = [];
        if (arr.length >= 0) {}
        `,
        errors: 1,
      },
      {
        code: `
        const arr = new Array();
        if (arr.length >= 0) {}
        `,
        errors: 1,
      },
      {
        code: `
        const set = new Set();
        if (set.length < 0) {}
        `,
        errors: 1,
      },
      {
        code: `
        const map = new Map();
        if (map.length < 0) {}
        `,
        errors: 1,
      },
      {
        code: `
        const set = new WeakSet();
        if (set.length < 0) {}
        `,
        errors: 1,
      },
      {
        code: `
        const map = new WeakMap();
        if (map.length < 0) {}
        `,
        errors: 1,
      },
    ],
  },
});
