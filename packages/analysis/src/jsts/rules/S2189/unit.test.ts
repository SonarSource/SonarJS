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

describe('S2189 - valid loops with exit conditions', () => {
  it('should accept valid loops with proper exit conditions', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          code: `
      for (var i=0;i<5;i++) {
        console.log("hello");
      }
            `,
        },
        {
          code: `
      var j = 0;
      while (true) { // reachable end condition added
        j++;
        if (j  == Integer.MIN_VALUE) {  // true at Integer.MAX_VALUE +1
          break;
        }
      }
            `,
        },
        {
          code: `
      function * generator() {
        while(true) { // OK (yield in the loop)
            foo();
            yield;
        }
      }
            `,
        },
        {
          code: `
      function someFunction() {
        while(true) { // OK (return in the loop)
            foo();
            return;
        }
      }
            `,
        },
        {
          code: `
      const sleep = time => {
        let count = 0;
        const waitTill = new Date(new Date().getTime() + time);
        while (waitTill > new Date()) { // OK (new Date() is different at each evaluation)
          count += 1;
        }
      };
            `,
        },
        {
          code: `
      function throws_interrupts_loop() {
        for(;;) {               // OK
            throw "We are leaving!";
        }

        while(true) {           // OK Doubly-nested throw
            while(true) {
                throw "We are leaving from deep inside!";
            }
        }
      }
            `,
        },
        {
          code: `
      while (until === undefined) {
        until = getUntil();
      }
            `,
        },
        {
          code: `
      outer:
      while (true) {
        while (true) {
          console.log("hello");
          break outer;
        }
      }
            `,
        },
      ],
      invalid: [],
    });
  });
});

describe('S2189 - false negatives and edge cases', () => {
  it('should accept loops with false negatives (modified value type)', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          code: `
      function do_while() {

        var trueValue = true;

        do {                      // FN
          trueValue = true;
        } while (trueValue);
      }
            `,
        },
        {
          code: `
      function always_true() {

        var trueValue = true;

        while(trueValue) {        // FN
          trueValue = 42;
        }
      }
            `,
        },
        {
          code: `
      while (true) {  // FN
        inner:
        while (true) {
          console.log("hello");
          break inner;
        }
      }
            `,
        },
      ],
      invalid: [],
    });
  });

  it('should accept loops with method calls that may modify condition', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          code: `
      let xs = [1, 2, 3];
      while (xs) {
        doSomething(xs.pop());
      }`,
        },
        {
          code: `
      let xs = [1, 2, 3];
      while (xs) {
        doSomething(xs);
      }`,
        },
        {
          code: `
      var parent = $container.find('.list')[0];
      while (parent && parent.firstChild) {
        parent.removeChild(parent.firstChild);
      }`,
        },
        {
          code: `
      let coverage = [1, 2, 3];
      while (coverage) {
        coverage.length;
        doSomething(coverage);
      }`,
        },
      ],
      invalid: [],
    });
  });
});

describe('S2189 - JS-131 false positive suppression', () => {
  it('should not raise on imported/required variables (JS-131)', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          code: `
      import { config } from './config';
      while (config.running) {
        doSomething();
      }`,
        },
        {
          code: `
      const config = require('./config');
      while (config.running) {
        doSomething();
      }`,
        },
      ],
      invalid: [],
    });
  });

  it('should not raise on file-scope variables with function calls (JS-131)', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          code: `
      var globalFlag = true;
      while (globalFlag) {
        someFunction();
      }`,
        },
        {
          code: `
      let running = true;
      while (running) {
        await processNext();
      }`,
        },
      ],
      invalid: [],
    });
  });

  it('should not raise on file-scope variables written inside functions (JS-131)', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          code: `
      let done = false;
      setTimeout(() => { done = true; }, 1000);
      while (!done) {
        wait();
      }`,
        },
      ],
      invalid: [],
    });
  });

  it('should not raise on loops with break/return exit conditions (JS-131)', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          code: `
      function scanHexDigits(minCount, scanAsManyAsPossible) {
        var digits = 0;
        while (digits < minCount || scanAsManyAsPossible) {
          if (!isHexDigit(text.charCodeAt(pos))) {
            break;
          }
          digits++;
        }
      }`,
        },
        {
          code: `
      function findMatch(items, target) {
        var found = false;
        while (!found) {
          if (items.pop() === target) {
            return true;
          }
        }
      }`,
        },
        {
          code: `
      function tracePath(segments) {
        var valid = true;
        while (valid) {
          var seg = segments.shift();
          if (!seg) {
            break;
          }
          process(seg);
        }
      }`,
        },
      ],
      invalid: [],
    });
  });
});
