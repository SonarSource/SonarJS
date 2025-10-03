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
import { StylelintRuleTester } from '../../../tests/tools/tester/index.js';
import { rule, messages } from './rule.js';
import { describe, it } from 'node:test';

const ruleTester = new StylelintRuleTester(rule.ruleName);
describe('S7423', () => {
  it('detects valid angle with rotateZ', () =>
    ruleTester.valid({
      codeFilename: 'noRestriction.html',
      code: `
<html lang="en">
	<head>
		<title>Page with some content</title>
		<style>
			@media (orientation: portrait) {
				html {
					transform: rotateZ(1turn);
				}
			}
		</style>
	</head>
	<body>
		<main>
			Page Content
		</main>
	</body>
</html>`,
    }));

  it('detects valid angle with matrix', () =>
    ruleTester.valid({
      codeFilename: 'noRestriction.html',
      code: `
<html lang="en">
	<head>
		<title>Page with some content</title>
		<style>
			@media (orientation: portrait) {
				html {
					transform: matrix(1, -1.22465e-15, 1.22465e-15, 1, 0, 0);
				}
			}
		</style>
	</head>
	<body>
		<main>
			Page Content
		</main>
	</body>
</html>`,
    }));

  it('restricts the element to landscape orientation with rotate', () =>
    ruleTester.invalid({
      codeFilename: 'restricted.html',
      code: `
<html lang="en">
	<head>
		<title>Page with some content</title>
		<style>
			@media (orientation: portrait) {
				html {
					transform: rotate(1.5708rad);
				}
			}
		</style>
	</head>
	<body>
		Page Content
	</body>
</html>`,
      errors: [{ text: `${messages.locked} (sonar/no-restrict-orientation)`, line: 8 }],
    }));

  it('restricts the element to landscape orientation with rotate3d', () =>
    ruleTester.invalid({
      codeFilename: 'restricted.html',
      code: `
<html lang="en">
	<head>
		<title>Page with some content</title>
		<style>
			@media (orientation: portrait) {
				html {
					transform: rotate3d(0, 0, 1, 90deg);
				}
			}
		</style>
	</head>
	<body>
		Page Content
	</body>
</html>`,
      errors: [{ text: `${messages.locked} (sonar/no-restrict-orientation)`, line: 8 }],
    }));

  it('restricts the element to landscape orientation with matrix3d', () =>
    ruleTester.invalid({
      codeFilename: 'restricted.html',
      code: `
<html lang="en">
	<head>
		<title>Page with some content</title>
		<style>
			@media (orientation: landscape) {
				body {
					transform: matrix3d(0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
				}
			}
		</style>
	</head>
	<body>
		Page Content
	</body>
</html>`,
      errors: [{ text: `${messages.locked} (sonar/no-restrict-orientation)`, line: 8 }],
    }));

  it('restricts the element to landscape orientation with rotate with tolerance', () =>
    ruleTester.invalid({
      codeFilename: 'restricted.html',
      code: `
<html lang="en">
	<head>
		<title>Page with some content</title>
		<style>
			body {
				transform: rotate(2.5deg);
			}

			@media (orientation: landscape) {
				body {
					transform: rotate(92.5deg);
				}
			}
		</style>
	</head>
	<body>
		Page Content
	</body>
</html>`,
      errors: [{ text: `${messages.locked} (sonar/no-restrict-orientation)`, line: 12 }],
    }));
});
