import { bundleAssessor } from './filter/bundeAssessor';

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
      expect(bundleAssessor('jquery.js', JQUERY)).toBeTruthy();
    });
  });
});
