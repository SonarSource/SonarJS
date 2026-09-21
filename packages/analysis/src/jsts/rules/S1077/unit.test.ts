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
import { rule } from './index.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S1077 SVG accessible name', () => {
  it('should flag SVGs with a missing or empty accessible name', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('alt-text - svg missing name', rule, {
      valid: [],
      invalid: [
        { code: `<svg viewBox="0 0 24 24"><path d="M12 4v16"/></svg>`, errors: 1 },
        { code: `<svg role="img" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>`, errors: 1 },
        { code: `<svg role="img" aria-label=""><path d="M5 12h14"/></svg>`, errors: 1 },
        { code: `<svg role="img" aria-label={null}><path d="M5 12h14"/></svg>`, errors: 1 },
        { code: `<svg role="img" aria-labelledby={null}><path d="M5 12h14"/></svg>`, errors: 1 },
        { code: `<svg role="img"><title></title><path d="M5 12h14"/></svg>`, errors: 1 },
        { code: `<svg role="img"><title>{false}</title></svg>`, errors: 1 },
      ],
    });
  });

  it('should not flag SVGs with a valid accessible name', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('alt-text - svg valid name', rule, {
      valid: [
        { code: `<svg aria-label="Arrow Down"><path d="M12 4v16"/></svg>` },
        // aria-labelledby is a presence check only - no id resolution, even when the id doesn't exist
        { code: `<svg aria-labelledby="does-not-exist"><path d="M12 4v16"/></svg>` },
        { code: `<svg><title>Settings</title><path d="M10 10"/></svg>` },
        // title position/formatting independence
        { code: `<svg><path d="M10 10"/><title>Settings</title></svg>` },
        {
          code: `
            <svg>
              <title>
                Settings
              </title>
              <path d="M10 10"/>
            </svg>
          `,
        },
        // multiple candidate names present together
        { code: `<svg aria-label="Settings" aria-labelledby="x"><title>Settings</title></svg>` },
        // dynamic i18n-style label - can't evaluate statically, suppress
        { code: `<svg aria-label={t('icon.label')}><path d="M10 10"/></svg>` },
      ],
      invalid: [],
    });
  });

  it('should respect aria-hidden, including inheritance from ancestors', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('alt-text - svg aria-hidden', rule, {
      valid: [
        { code: `<svg aria-hidden="true"><path d="M12 4v16"/></svg>` },
        { code: `<svg aria-hidden={true}><path d="M12 4v16"/></svg>` },
        {
          code: `<span aria-hidden="true"><svg><path d="M12 4v16"/></svg></span>`,
        },
        // dynamic aria-hidden - can't evaluate statically, conservatively suppress
        { code: `<svg aria-hidden={isDecorative}><path d="M12 4v16"/></svg>` },
      ],
      invalid: [
        // closer explicit aria-hidden="false" overrides a further true ancestor
        {
          code: `<span aria-hidden="true"><svg aria-hidden="false"><path d="M12 4v16"/></svg></span>`,
          errors: 1,
        },
      ],
    });
  });

  it('should respect decorative roles and first-token role fallback lists', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('alt-text - svg decorative role', rule, {
      valid: [
        { code: `<svg role="presentation"><path d="M12 4v16"/></svg>` },
        { code: `<svg role="none"><path d="M12 4v16"/></svg>` },
        // fallback list: decorative token first wins
        { code: `<svg role="presentation img"><path d="M12 4v16"/></svg>` },
        // dynamic role - can't evaluate statically, conservatively suppress
        { code: `<svg role={computedRole}><path d="M12 4v16"/></svg>` },
      ],
      invalid: [
        // fallback list: meaningful token first wins, still a true positive when unnamed
        { code: `<svg role="img presentation"><path d="M12 4v16"/></svg>`, errors: 1 },
      ],
    });
  });

  it('known limitation: does not validate name content quality beyond emptiness', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    // Punctuation-only text is treated as a valid accessible name - only emptiness is
    // checked, not whether the content is meaningful. Matches upstream jsx-a11y/alt-text
    // and Biome's no-svg-without-title, neither of which validate content quality either.
    // Left uncovered deliberately; revisit if this proves to be a real-world FN source.
    ruleTester.run('alt-text - svg punctuation-only names', rule, {
      valid: [
        { code: `<svg><title>-</title><path d="M10 10"/></svg>` },
        { code: `<svg aria-label="."><path d="M10 10"/></svg>` },
      ],
      invalid: [],
    });
  });

  it('should treat JSX spreads conservatively', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('alt-text - svg spread attributes', rule, {
      valid: [{ code: `<svg {...svgProps}><path d="M12 4v16"/></svg>` }],
      invalid: [],
    });
  });

  it('should evaluate nested SVGs independently, without special-casing icon sprites', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('alt-text - nested svg', rule, {
      valid: [],
      invalid: [
        {
          code: `
            <svg>
              <title>Icon sprite</title>
              <defs>
                <svg id="icon-a" viewBox="0 0 24 24"><path d="M12 4v16"/></svg>
              </defs>
            </svg>
          `,
          errors: 1,
        },
      ],
    });
  });

  it('should keep existing alt-text behavior for img elements alongside svg checks', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('alt-text - mixed img and svg', rule, {
      valid: [
        {
          code: `
            function Component() {
              return (
                <div>
                  <img src="a.png" alt="" />
                  <svg><title>Settings</title><path d="M10 10"/></svg>
                </div>
              );
            }
          `,
        },
      ],
      invalid: [
        {
          code: `
            function Component() {
              return (
                <div>
                  <img src="a.png" />
                  <svg><title>Settings</title><path d="M10 10"/></svg>
                </div>
              );
            }
          `,
          errors: 1,
        },
      ],
    });
  });
});
