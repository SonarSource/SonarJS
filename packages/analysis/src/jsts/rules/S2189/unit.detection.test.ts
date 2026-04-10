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

const RULE_NAME = 'Loops should not be infinite';

describe('S2189 - JS-1476 false positive suppression for closure side effects', () => {
  it('should not raise when closure variable is modified by a function called in the loop (while)', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          // ch is a closure variable; next() writes to ch and is called in the loop
          code: `
var parser = (function () {
  var ch = '';
  var next = function () {
    ch = String.fromCharCode(ch.charCodeAt(0) + 1);
  };
  var white = function () {
    while (ch && ch <= ' ') {
      next();
    }
  };
  return { white };
})();
          `,
        },
        {
          // token is a closure variable; readToken() writes to token and is called in the loop
          code: `
function tokenize(source) {
  var token = null;
  var pos = 0;
  var readToken = function () {
    token = pos < source.length ? source[pos++] : null;
  };
  readToken();
  while (token !== null) {
    processToken(token);
    readToken();
  }
}
          `,
        },
      ],
      invalid: [],
    });
  });

  it('should not raise when closure variable is modified by a function called in a do-while loop', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          // pendingEffectsStatus is a closure variable; flushPendingEffects() writes to it and is called in the loop
          code: `
function commitRoot() {
  var pendingEffectsStatus = 'PENDING';
  var flushPendingEffects = function () {
    pendingEffectsStatus = 'DONE';
  };
  do {
    flushPendingEffects();
  } while (pendingEffectsStatus !== 'DONE');
}
          `,
        },
      ],
      invalid: [],
    });
  });

  it('should not raise when closure variable is modified by a function called in the for-loop update expression', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          // token is a closure variable; readToken() writes to token and is called in the for-loop update
          code: `
function tokenize(source) {
  var token = null;
  var pos = 0;
  var readToken = function () {
    token = pos < source.length ? source[pos++] : null;
  };
  readToken();
  for (; token !== null; readToken()) {
    processToken(token);
  }
}
          `,
        },
      ],
      invalid: [],
    });
  });

  it('should not raise when closure variable is modified by a function called in the loop condition', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          // ch is a closure variable; next() writes to ch and is called in the while condition
          code: `
var parser = (function () {
  var ch = '';
  var next = function () {
    ch = String.fromCharCode(ch.charCodeAt(0) + 1);
    return ch;
  };
  var number = function () {
    while (next() && ch >= '0' && ch <= '9') {
      processDigit(ch);
    }
  };
  return { number };
})();
          `,
        },
      ],
      invalid: [],
    });
  });

  it('should still raise when the called function does not write to the condition variable', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [],
      invalid: [
        {
          // doUnrelatedWork() does not write to status, so the loop is still flagged
          code: `
function process() {
  var status = 'PENDING';
  var doUnrelatedWork = function () {
    var x = 1;
  };
  while (status !== 'DONE') {
    doUnrelatedWork();
  }
}
          `,
          errors: [{ message: "'status' is not modified in this loop." }],
        },
      ],
    });
  });
});

describe('S2189 - detection of infinite loops', () => {
  it('should detect infinite loops with unmodified variables', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [],
      invalid: [
        {
          code: `
      var k = 0;
      var b = true;
      while (b) { // Noncompliant; b never written to in loop
        k++;
      }
            `,
          errors: [
            {
              line: 4,
              endLine: 4,
              column: 14,
              endColumn: 15,
              message: "'b' is not modified in this loop.",
            },
          ],
        },
      ],
    });
  });

  it('should detect infinite loops with literal true condition', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [],
      invalid: [
        {
          code: `
      while (true) {
        console.log("hello");
      }
            `,
          errors: [
            {
              line: 2,
              endLine: 2,
              column: 7,
              endColumn: 12,
              message: "Correct this loop's end condition to not be invariant.",
            },
          ],
        },
        {
          code: `
      for (;;) {
        console.log("hello");
      }
            `,
          errors: 1,
        },
        {
          code: `
      for (;true;) {
        console.log("hello");
      }
            `,
          errors: 1,
        },
        {
          code: `
      do {
        console.log("hello");
      } while (true);
            `,
          errors: 1,
        },
      ],
    });
  });

  it('should detect infinite loops with invariant string condition', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [],
      invalid: [
        {
          code: `
      for (var str = '';str >= '0' && '9' >= str;) {
        console.log("hello");
      }
            `,
          errors: 1,
        },
      ],
    });
  });

  it('should detect infinite loops with nested break targeting inner loop', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [],
      invalid: [
        {
          code: `
      while (true) { // Noncompliant
        while (true) {
          if (cond) {
            break;
          }
        }
      }
            `,
          errors: 1,
        },
      ],
    });
  });

  it('should detect infinite loops with function declarations inside', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [],
      invalid: [
        {
          code: `
      while (true) {
        function doSomething() {
          return "hello";
        }
      }
            `,
          errors: 1,
        },
        {
          code: `
      while (true) {
        var a = function () {return 0;};
      }
            `,
          errors: 1,
        },
      ],
    });
  });

  it('should raise on unmodified part of compound condition (JS-131)', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [],
      invalid: [
        {
          code: `
      function processBlock(ordinary) {
        var indent = 0;
        while (!ordinary && shouldContinue(indent)) {
          indent += 1;
        }
      }
            `,
          errors: [
            {
              message: "'ordinary' is not modified in this loop.",
            },
          ],
        },
      ],
    });
  });
});
