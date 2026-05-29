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
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { describe, it } from 'node:test';

describe('S5868', () => {
  it('S5868', () => {
    const ruleTester = new DefaultParserRuleTester();
    const ecma2015 = 2015;
    const literalSuggestionStart = 12;
    const literalSuggestionEnd = 13;
    const quotedConstructorSuggestionStart = 24;
    const quotedConstructorSuggestionEnd = 25;
    const templateConstructorSuggestionStart = 20;
    const templateConstructorSuggestionEnd = 26;
    const rawConstructorSuggestionEnd = 36;

    const combiningClass = c =>
      `Move this Unicode combined character '${c}' outside of the character class`;

    const modifiedEmoji = c =>
      `Move this Unicode modified Emoji '${c}' outside of the character class`;
    const regionalIndicator = c =>
      `Move this Unicode regional indicator '${c}' outside of the character class`;
    const zwj = 'Move this Unicode joined character sequence outside of the character class';

    ruleTester.run('', rule, {
      valid: [
        { code: String.raw`var r = /[\uD83D\d\uDC4D]/` },
        { code: String.raw`var r = /[\uD83D-\uDC4D]/` },
        { code: 'var r = /[👍]/u' },
        { code: String.raw`var r = /[\uD83D\uDC4D]/u` },
        { code: String.raw`var r = /[\u{1F44D}]/u` },
        { code: 'var r = /❇️/' },
        { code: 'var r = /Á/' },
        { code: 'var r = /[❇]/' },
        { code: 'var r = /👶🏻/' },
        { code: 'var r = /[👶]/u' },
        { code: 'var r = /🇯🇵/' },
        { code: 'var r = /[JP]/' },
        { code: 'var r = /👨‍👩‍👦/' },

        { code: String.raw`var r = /[\uD83D]/` },
        { code: String.raw`var r = /[\uDC4D]/` },
        { code: String.raw`var r = /[\uD83D]/u` },
        { code: String.raw`var r = /[\uDC4D]/u` },

        { code: String.raw`var r = /[\u0301]/` },
        { code: String.raw`var r = /[\uFE0F]/` },
        { code: String.raw`var r = /[\u0301]/u` },
        { code: String.raw`var r = /[\uFE0F]/u` },

        { code: String.raw`var r = /[x\S]/u` },
        { code: 'var r = /[xa-z]/u' },

        { code: String.raw`var r = /[\u{1F3FB}]/u` },
        { code: 'var r = /[\u{1F3FB}]/u' },

        { code: 'var r = /[🇯]/u' },
        { code: 'var r = /[🇵]/u' },

        { code: String.raw`var r = /[\u200D]/` },
        { code: String.raw`var r = /[\u200D]/u` },

        {
          code: String.raw`const part1 = '\u00BA', part2 = '\u0300', r = new RegExp('[' + part1 + part2 + ']')`,
        },
        {
          code: String.raw`const rangeA = '\u00C0-\u00D6', rangeB = '\u0300-\u036F', r = new RegExp('[' + rangeA + rangeB + ']')`,
        },
        {
          code: String.raw`const high = '\uD83D', low = '\uDC4D', r = new RegExp('[' + high + low + ']')`,
        },
        {
          code: String.raw`const baby = '\u{1F476}', skinTone = '\u{1F3FB}', r = new RegExp('[' + baby + skinTone + ']', 'u')`,
          languageOptions: { ecmaVersion: ecma2015 },
        },
        {
          code: String.raw`const first = '\u{1F1EF}', second = '\u{1F1F5}', r = new RegExp('[' + first + second + ']', 'u')`,
          languageOptions: { ecmaVersion: ecma2015 },
        },
        {
          code: String.raw`const man = '\u{1F468}', zwjChar = '\u200D', woman = '\u{1F469}', r = new RegExp('[' + man + zwjChar + woman + ']', 'u')`,
          languageOptions: { ecmaVersion: ecma2015 },
        },

        // don't report and don't crash on invalid regex
        { code: "var r = new RegExp('[Á] [ ');" },
        { code: "var r = RegExp('{ [Á]', 'u');" },

        // new RegExp(`^\\[Á]$`).test("[Á]") -> true
        { code: 'new RegExp(`^\\\\[Á]$`).test("[Á]")' },

        {
          code: "var r = new globalThis.RegExp('[Á] [ ');",
        },
        {
          code: "var r = globalThis.RegExp('{ [Á]', 'u');",
        },
      ],
      invalid: [
        {
          code: String.raw`var r = /[\u0041\u0301-\u0301]/`,
          errors: [
            { column: 17, endColumn: 23, message: combiningClass(String.raw`\u0041\u0301`) },
          ],
        },
        {
          code: 'var r = /[Á]/',
          errors: [{ message: combiningClass('Á') }],
        },
        {
          code: 'var r = new RegExp("[Á]")',
          errors: [{ column: 23, endColumn: 24, message: combiningClass('Á') }],
        },
        {
          code: 'var r = new RegExp(`[Á]`)',
          errors: [{ column: 20, endColumn: 26, message: combiningClass('Á') }],
        },
        {
          code: 'var r = new RegExp(String.raw`[Á]`)',
          errors: [{ column: 20, endColumn: 36, message: combiningClass('Á') }],
        },
        // Regexp is /\\[Á]/ corresponding to <backslash/><character-class range="Á"/>
        {
          code: 'var r = new RegExp(String.raw`\\\\[Á]`)',
          errors: [{ column: 20, endColumn: 38, message: combiningClass('Á') }],
        },
        {
          code: 'var r = /[Á]/u',
          errors: [{ message: combiningClass('Á') }],
        },
        {
          code: String.raw`var r = /[\u0041\u0301]/`,
          errors: [{ message: combiningClass(String.raw`\u0041\u0301`) }],
        },
        {
          code: String.raw`var r = /[\u0041\u0301]/u`,
          errors: [{ message: combiningClass(String.raw`\u0041\u0301`) }],
        },
        {
          code: String.raw`var r = /[\u{41}\u{301}]/u`,
          errors: [{ message: combiningClass(String.raw`\u{41}\u{301}`) }],
        },
        {
          code: 'var r = /[❇️]/',
          errors: [{ message: combiningClass('❇️') }],
        },
        {
          code: 'var r = /[❇️]/u',
          errors: [{ message: combiningClass('❇️') }],
        },
        {
          code: String.raw`var r = /[\u2747\uFE0F]/`,
          errors: [{ message: combiningClass(String.raw`\u2747\uFE0F`) }],
        },
        {
          code: String.raw`var r = /[\u2747\uFE0F]/u`,
          errors: [{ message: combiningClass(String.raw`\u2747\uFE0F`) }],
        },
        {
          code: String.raw`var r = /[\u{2747}\u{FE0F}]/u`,
          errors: [{ message: combiningClass(String.raw`\u{2747}\u{FE0F}`) }],
        },
        {
          code: String.raw`var r = new globalThis.RegExp("[❇️]", "")`,
          errors: [{ message: combiningClass('❇️') }],
        },
        {
          code: String.raw`"cc̈d̈d".replaceAll(RegExp("[c̈d̈]"), "X")`,
          errors: [{ message: combiningClass('c̈') }],
        },

        // RegExp Literals.
        {
          code: 'var r = /[👍]/',
          errors: surrogatePair(
            '👍',
            'var r = /[👍]/u',
            literalSuggestionStart,
            literalSuggestionEnd,
          ),
        },
        {
          code: String.raw`var r = /[\uD83D\uDC4D]/`,
          errors: surrogatePair(String.raw`\uD83D\uDC4D`, String.raw`var r = /[\uD83D\uDC4D]/u`),
        },
        {
          code: 'var r = /(?<=[👍])/',
          languageOptions: { ecmaVersion: 9 },
          errors: surrogatePair('👍', 'var r = /(?<=[👍])/u'),
        },
        {
          code: 'var r = /[👶🏻]/',
          errors: surrogatePair('👶', 'var r = /[👶🏻]/u'),
        },
        {
          code: 'var r = /[👶🏻]/u',
          errors: [{ column: 13, endColumn: 15, message: modifiedEmoji('👶🏻') }],
        },
        {
          code: 'var r = new RegExp("[👶🏻]", "u")',
          errors: [{ column: 26, endColumn: 27, message: modifiedEmoji('👶🏻') }],
        },
        {
          code: 'var r = new RegExp(String.raw`[👶🏻]`, String.raw`u`)',
          errors: [{ column: 20, endColumn: 38, message: modifiedEmoji('👶🏻') }],
        },
        {
          code: String.raw`var r = /[\uD83D\uDC76\uD83C\uDFFB]/u`,
          errors: [{ message: modifiedEmoji(String.raw`\uD83D\uDC76\uD83C\uDFFB`) }],
        },
        {
          code: String.raw`var r = /[\u{1F476}\u{1F3FB}]/u`,
          errors: [{ message: modifiedEmoji(String.raw`\u{1F476}\u{1F3FB}`) }],
        },
        {
          code: 'var r = /[🇯🇵]/',
          errors: surrogatePair('🇯', 'var r = /[🇯🇵]/u'),
        },
        {
          code: 'var r = /[🇯🇵]/i',
          errors: surrogatePair('🇯', 'var r = /[🇯🇵]/iu'),
        },
        {
          code: 'var r = /[🇯🇵]/u',
          errors: [{ column: 13, endColumn: 15, message: regionalIndicator('🇯🇵') }],
        },
        {
          code: 'var r = new RegExp("[🇯🇵]", "u")',
          errors: [{ column: 26, endColumn: 27, message: regionalIndicator('🇯🇵') }],
        },
        {
          code: 'var r = new RegExp(`[🇯🇵]`, `u`)',
          errors: [{ column: 20, endColumn: 28, message: regionalIndicator('🇯🇵') }],
        },
        {
          code: 'var r = new RegExp(String.raw`[🇯🇵]`, `u`)',
          errors: [{ column: 20, endColumn: 38, message: regionalIndicator('🇯🇵') }],
        },
        {
          code: String.raw`var r = /[\uD83C\uDDEF\uD83C\uDDF5]/u`,
          errors: [{ message: regionalIndicator(String.raw`\uD83C\uDDEF\uD83C\uDDF5`) }],
        },
        {
          code: String.raw`var r = /[\u{1F1EF}\u{1F1F5}]/u`,
          errors: [{ message: regionalIndicator(String.raw`\u{1F1EF}\u{1F1F5}`) }],
        },
        {
          code: 'var r = /[👨‍👩‍👦]/',
          errors: surrogatePair('👨', 'var r = /[👨‍👩‍👦]/u'),
        },
        {
          code: 'var r = /[👨‍👩‍👦]/u',
          errors: [{ column: 11, endColumn: 13, message: zwj }],
        },
        {
          code: 'var r = new RegExp("[👨‍👩‍👦]", "u")',
          errors: [{ column: 22, endColumn: 25, message: zwj }],
        },
        {
          code: 'var r = new RegExp(`[👨‍👩‍👦]`, `u`)',
          errors: [{ column: 20, endColumn: 32, message: zwj }],
        },
        {
          code: 'var r = new RegExp(String.raw`[👨‍👩‍👦]`, String.raw`u`)',
          errors: [{ column: 20, endColumn: 42, message: zwj }],
        },
        {
          code: String.raw`var r = /[\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC66]/u`,
          errors: [{ message: zwj }],
        },
        {
          code: String.raw`var r = /[\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F466}]/u`,
          errors: [{ message: zwj }],
        },

        // RegExp constructors.
        {
          code: 'var r = new RegExp("[👍]")',
          errors: surrogatePair(
            '👍',
            'var r = new RegExp("[👍]", "u")',
            quotedConstructorSuggestionStart,
            quotedConstructorSuggestionEnd,
          ),
        },
        {
          code: 'var r = new RegExp(`[👍]`)',
          errors: surrogatePair(
            '👍',
            'var r = new RegExp(`[👍]`, "u")',
            templateConstructorSuggestionStart,
            templateConstructorSuggestionEnd,
          ),
        },
        {
          code: 'var r = new RegExp(String.raw`[👍]`)',
          errors: surrogatePair(
            '👍',
            'var r = new RegExp(String.raw`[👍]`, "u")',
            templateConstructorSuggestionStart,
            rawConstructorSuggestionEnd,
          ),
        },
        {
          code: 'var r = new RegExp("[👍]", "")',
          errors: surrogatePair('👍', 'var r = new RegExp("[👍]", "u")'),
        },
        {
          code: 'var r = new RegExp(`[👍]`, ``)',
          errors: surrogatePair('👍', 'var r = new RegExp(`[👍]`, `u`)'),
        },
        {
          code: 'var r = new RegExp(String.raw`[👍]`, String.raw``)',
          errors: surrogatePair('👍', 'var r = new RegExp(String.raw`[👍]`, String.raw`u`)'),
        },
        {
          code: 'var r = new RegExp("[👍]", "i")',
          errors: surrogatePair('👍', 'var r = new RegExp("[👍]", "iu")'),
        },
        {
          code: 'var r = new RegExp(`[👍]`, `i`)',
          errors: surrogatePair('👍', 'var r = new RegExp(`[👍]`, `iu`)'),
        },
        {
          code: 'var r = new RegExp(String.raw`[👍]`, String.raw`i`)',
          errors: surrogatePair('👍', 'var r = new RegExp(String.raw`[👍]`, String.raw`iu`)'),
        },
        {
          code: String.raw`var r = new RegExp("[\\uD83D\\uDC4D]", "")`,
          errors: surrogatePair(
            String.raw`\uD83D\uDC4D`,
            String.raw`var r = new RegExp("[\\uD83D\\uDC4D]", "u")`,
          ),
        },
        {
          code: String.raw`var r = new RegExp("/(?<=[👍])", "")`,
          languageOptions: { ecmaVersion: 9 },
          errors: surrogatePair('👍', String.raw`var r = new RegExp("/(?<=[👍])", "u")`),
        },
        {
          code: String.raw`var r = new RegExp("/(?<=[👍])", "")`,
          languageOptions: { ecmaVersion: 2018 },
          errors: surrogatePair('👍', String.raw`var r = new RegExp("/(?<=[👍])", "u")`),
        },
        {
          code: String.raw`var r = new RegExp("[👶🏻]", "")`,
          errors: surrogatePair('👶', String.raw`var r = new RegExp("[👶🏻]", "u")`),
        },
        {
          code: String.raw`var r = new RegExp("[\\uD83D\\uDC76\\uD83C\\uDFFB]", "u")`,
          errors: [{ message: modifiedEmoji(String.raw`\uD83D\uDC76\uD83C\uDFFB`) }],
        },
        {
          code: String.raw`var r = new RegExp("[\\u{1F476}\\u{1F3FB}]", "u")`,
          errors: [{ message: modifiedEmoji(String.raw`\u{1F476}\u{1F3FB}`) }],
        },
        {
          code: String.raw`var r = new RegExp("[🇯🇵]", "")`,
          errors: surrogatePair('🇯', String.raw`var r = new RegExp("[🇯🇵]", "u")`),
        },
        {
          code: String.raw`var r = new RegExp("[🇯🇵]", "i")`,
          errors: surrogatePair('🇯', String.raw`var r = new RegExp("[🇯🇵]", "iu")`),
        },
        {
          code: "var r = new RegExp('[🇯🇵]', `i`)",
          errors: surrogatePair('🇯', "var r = new RegExp('[🇯🇵]', `iu`)"),
        },
        {
          code: String.raw`var r = new RegExp("[🇯🇵]")`,
          errors: surrogatePair('🇯', String.raw`var r = new RegExp("[🇯🇵]", "u")`),
        },
        {
          code: String.raw`var r = new RegExp(("[🇯🇵]"))`,
          errors: surrogatePair('🇯', String.raw`var r = new RegExp(("[🇯🇵]"), "u")`),
        },
        {
          code: String.raw`var r = new RegExp((("[🇯🇵]")))`,
          errors: surrogatePair('🇯', String.raw`var r = new RegExp((("[🇯🇵]")), "u")`),
        },
        {
          code: String.raw`var r = new RegExp("[\\uD83C\\uDDEF\\uD83C\\uDDF5]", "u")`,
          errors: [{ message: regionalIndicator(String.raw`\uD83C\uDDEF\uD83C\uDDF5`) }],
        },
        {
          code: String.raw`var r = new RegExp("[\\u{1F1EF}\\u{1F1F5}]", "u")`,
          errors: [{ message: regionalIndicator(String.raw`\u{1F1EF}\u{1F1F5}`) }],
        },
        {
          code: String.raw`var r = new RegExp("[👨‍👩‍👦]", "")`,
          errors: surrogatePair('👨', String.raw`var r = new RegExp("[👨‍👩‍👦]", "u")`),
        },
        {
          code: String.raw`var r = new RegExp("[\\uD83D\\uDC68\\u200D\\uD83D\\uDC69\\u200D\\uD83D\\uDC66]", "u")`,
          errors: [{ message: zwj }],
        },
        {
          code: String.raw`var r = new RegExp("[\\u{1F468}\\u{200D}\\u{1F469}\\u{200D}\\u{1F466}]", "u")`,
          errors: [{ message: zwj }],
        },
        {
          code: String.raw`var r = new globalThis.RegExp("[👶🏻]", "u")`,
          errors: [{ message: modifiedEmoji('👶🏻') }],
        },
        {
          code: String.raw`var r = new globalThis.RegExp("[🇯🇵]", "")`,
          errors: surrogatePair('🇯', String.raw`var r = new globalThis.RegExp("[🇯🇵]", "u")`),
        },
        {
          code: String.raw`var r = new globalThis.RegExp("[\\u{1F468}\\u{200D}\\u{1F469}\\u{200D}\\u{1F466}]", "u")`,
          errors: [{ message: zwj }],
        },
        {
          code: 'var r = new RegExp("[" + "👍" + "]")',
          errors: surrogatePair('👍', 'var r = new RegExp("[" + "👍" + "]", "u")'),
        },
        {
          code: 'const p = "[" + "👍" + "]", r = new RegExp(p)',
          errors: surrogatePair('👍', 'const p = "[" + "👍" + "]", r = new RegExp(p, "u")'),
        },
        {
          code: 'const c = "👍", p = "[" + c + "]", r = new RegExp(p)',
          errors: surrogatePair('👍', 'const c = "👍", p = "[" + c + "]", r = new RegExp(p, "u")'),
        },
        {
          code: String.raw`const part1 = '\u00BA', part2 = '\u0300A\u0301', r = new RegExp('[' + part1 + part2 + ']')`,
          errors: [{ message: combiningClass('Á') }],
        },
      ],
    });
  });
});

function surrogatePair(c, output?, start?: number, end?: number) {
  const error = {
    message: `Move this Unicode surrogate pair '${c}' outside of the character class or use 'u' flag`,
  };
  if (output) {
    error['suggestions'] = [{ desc: "Add unicode 'u' flag to regex", output }];
  }
  if (start != null) {
    error['column'] = start;
  }
  if (end != null) {
    error['endColumn'] = end;
  }
  return [error];
}
