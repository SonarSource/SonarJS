/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { bundleAssessor } from './bundleAssessor';

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
