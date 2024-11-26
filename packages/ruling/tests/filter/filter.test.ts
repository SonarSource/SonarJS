/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { bundleAssessor } from './bundleAssessor.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

describe('assessors', () => {
  describe('bundleAssessor', () => {
    it('should return true for a bundle file', () => {
      const JQUERY =
        '/*!\n' +
        ' * jQuery JavaScript Library v1.4.3\n' +
        ' * http://jquery.com/\n' +
        ' *\n' +
        ' * Copyright 2010, John Resig\n' +
        ' * Dual licensed under the MIT or GPL Version 2 licenses.\n' +
        ' * http://jquery.org/license\n' +
        ' *\n' +
        ' * Includes Sizzle.js\n' +
        ' * http://sizzlejs.com/\n' +
        ' * Copyright 2010, The Dojo Foundation\n' +
        ' * Released under the MIT, BSD, and GPL Licenses.\n' +
        ' *\n' +
        ' * Date: Thu Oct 14 23:10:06 2010 -0400\n' +
        ' */\n' +
        '(function( window, undefined ) {\n' +
        '\n' +
        '// Use the correct document accordingly with window argument (sandbox)\n' +
        'var document = window.document;\n' +
        'var jQuery = (function() {';
      expect(bundleAssessor(JQUERY)).toBeFalsy();
    });
  });
});
