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
import {
  DefaultParserRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S5725', () => {
  it('S5725', () => {
    const ruleTesterJs = new DefaultParserRuleTester();
    const ruleTesterTs = new RuleTester();

    ruleTesterJs.run('No issues without types', rule, {
      valid: [
        {
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"; // Sensitive
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
        },
      ],
      invalid: [],
    });

    ruleTesterTs.run('Disabling resource integrity features is security-sensitive', rule, {
      valid: [
        {
          // Compliant: both integrity and crossOrigin are set
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";
      script.integrity = "sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=";
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
        },
        {
          // Compliant: src is not a literal
          code: `
      var script = document.createElement("script");
      script.src = getSource();
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
        },
        {
          // Compliant: multiple src assignments (conditional)
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";
      if (x) {
        script.src = getSource();
      }
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
        },
        {
          // Compliant: wrong method (document.other)
          code: `
      var script = document.other("script");
      script.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";
      if (x) {
        script.src = getSource();
      }
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
        },
        {
          // Compliant: wrong object (other.createElement)
          code: `
      var script = other.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";
      if (x) {
        script.src = getSource();
      }
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
        },
        {
          // Coverage
          code: `
      var script = getScript();
      script.src = getSource();
      var [a, b] = getArray();
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
        },
        {
          // Compliant: integrity and crossOrigin set, extra src ref
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";
      var other = script.src;
      script.integrity = "sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=";
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
        },
        {
          // Compliant: not a script element
          code: `
      var script = document.createElement("other");
      script.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
        },
        {
          // Compliant: crossOrigin assigned a non-literal — value cannot be resolved, no FP
          code: `
      function load(crossOrigin) {
        var script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";
        script.integrity = "sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=";
        script.crossOrigin = crossOrigin;
        document.head.appendChild(script);
      }
            `,
        },
        {
          // Compliant: "use-credentials" overwritten by "anonymous" — final value is compliant
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";
      script.integrity = "sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=";
      script.crossOrigin = "use-credentials";
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
        },
        {
          code: `
        if (cond) {
          var script = document.createElement( "script" );
          script.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"; // FN (missing variable)
        }
            `,
        },
        {
          // Compliant: URL has no version path segment (version embedded in filename)
          code: `
      var script = document.createElement("script");
      script.src = "https://code.jquery.com/jquery-3.4.1.min.js";
      document.head.appendChild(script);
            `,
        },
        {
          // Compliant: URL has no version path segment (Google Tag Manager)
          code: `
      var script = document.createElement("script");
      script.src = "https://www.googletagmanager.com/gtag/js?id=UA-XXXXX-X";
      document.head.appendChild(script);
            `,
        },
        {
          // Compliant: only major version in path (v3 with no minor component)
          code: `
      var script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/stripe.js";
      document.head.appendChild(script);
            `,
        },
        {
          // Compliant: no version segment at all
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.example.com/latest/script.js";
      document.head.appendChild(script);
            `,
        },
        {
          // Compliant: version embedded in filename, not a standalone path segment
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.example.com/script-1.2.3.min.js";
      document.head.appendChild(script);
            `,
        },
      ],
      invalid: [
        {
          // Sensitive: versioned URL (semver path), integrity missing (crossOrigin present)
          code: `
      var script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js"; // Sensitive
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
          errors: [
            {
              line: 2,
              endLine: 2,
              column: 11,
              endColumn: 52,
              message: 'Add an integrity attribute to this element to enforce integrity checks.',
            },
          ],
        },
        {
          // Sensitive: versioned URL (protocol-relative), integrity missing (crossOrigin present)
          code: `
      var script = document.createElement("script");
      script.src = "//cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js"; // Sensitive
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
          errors: 1,
        },
        {
          // Sensitive: versioned URL (package@version), both missing
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"; // Sensitive
      document.head.appendChild(script);
            `,
          errors: [
            {
              message:
                'Add integrity and crossorigin="anonymous" attributes to this element to enforce integrity checks.',
            },
          ],
        },
        {
          // Sensitive: versioned URL with integrity but crossOrigin missing entirely
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";
      script.integrity = "sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=";
      document.head.appendChild(script);
            `,
          errors: [
            {
              line: 2,
              endLine: 2,
              message:
                'Add a crossorigin="anonymous" attribute to this element to enforce integrity checks.',
            },
          ],
        },
        {
          // Sensitive: crossOrigin assigned a literal that is not "anonymous"
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";
      script.integrity = "sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=";
      script.crossOrigin = "use-credentials";
      document.head.appendChild(script);
            `,
          errors: [
            {
              message:
                'Add a crossorigin="anonymous" attribute to this element to enforce integrity checks.',
            },
          ],
        },
        {
          // Sensitive: "anonymous" then "use-credentials" — final value is non-compliant
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";
      script.integrity = "sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=";
      script.crossOrigin = "anonymous";
      script.crossOrigin = "use-credentials";
      document.head.appendChild(script);
            `,
          errors: [
            {
              message:
                'Add a crossorigin="anonymous" attribute to this element to enforce integrity checks.',
            },
          ],
        },
        {
          // Sensitive: versioned URL (bootstrap@5), both missing
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5/dist/js/bootstrap.min.js";
      document.head.appendChild(script);
            `,
          errors: [
            {
              message:
                'Add integrity and crossorigin="anonymous" attributes to this element to enforce integrity checks.',
            },
          ],
        },
        {
          // Sensitive: versioned URL (v-prefixed semver), both missing
          code: `
      var script = document.createElement("script");
      script.src = "https://example.com/libs/v5.3.0/script.min.js";
      document.head.appendChild(script);
            `,
          errors: [
            {
              message:
                'Add integrity and crossorigin="anonymous" attributes to this element to enforce integrity checks.',
            },
          ],
        },
        {
          // Sensitive: semver as last path segment (no trailing slash), both missing
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.example.com/1.2.3";
      document.head.appendChild(script);
            `,
          errors: [
            {
              message:
                'Add integrity and crossorigin="anonymous" attributes to this element to enforce integrity checks.',
            },
          ],
        },
        {
          // Sensitive: package@version as last path segment (no trailing slash), both missing
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0";
      document.head.appendChild(script);
            `,
          errors: [
            {
              message:
                'Add integrity and crossorigin="anonymous" attributes to this element to enforce integrity checks.',
            },
          ],
        },
        {
          // Sensitive: prerelease alias URL (package@major.minor.patch-pre), both missing
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/react@19.0.0-rc.1/umd/react.production.min.js";
      document.head.appendChild(script);
            `,
          errors: [
            {
              message:
                'Add integrity and crossorigin="anonymous" attributes to this element to enforce integrity checks.',
            },
          ],
        },
        {
          // Sensitive: prerelease semver path segment (/major.minor.patch-pre/), both missing
          code: `
      var script = document.createElement("script");
      script.src = "https://example.com/libs/3.7.1-beta.3/script.min.js";
      document.head.appendChild(script);
            `,
          errors: [
            {
              message:
                'Add integrity and crossorigin="anonymous" attributes to this element to enforce integrity checks.',
            },
          ],
        },
        {
          // Sensitive: minor-only semver path segment (/major.minor/), both missing
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.example.com/1.2/script.js";
      document.head.appendChild(script);
            `,
          errors: [
            {
              message:
                'Add integrity and crossorigin="anonymous" attributes to this element to enforce integrity checks.',
            },
          ],
        },
        {
          // Sensitive: minor-only alias (package@major.minor), both missing
          code: `
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3/dist/js/bootstrap.min.js";
      document.head.appendChild(script);
            `,
          errors: [
            {
              message:
                'Add integrity and crossorigin="anonymous" attributes to this element to enforce integrity checks.',
            },
          ],
        },
      ],
    });
  });
});
