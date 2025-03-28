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
import { rule } from './rule.js';
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const ruleTester = new DefaultParserRuleTester();

describe('S1126', () => {
  it('S1126', () => {
    ruleTester.run('prefer-single-boolean-return', rule, {
      valid: [
        {
          code: `
        function foo() {
          if (something) {
            return true;
          } else if (something) {
            return false;
          } else {
            return true;
          }
        }
      `,
        },
        {
          code: `
        function foo() {
          if (something) {
            return x;
          } else {
            return false;
          }
        }
      `,
        },
        {
          code: `
        function foo(y) {
          if (something) {
            return true;
          } else {
            return foo;
          }
        }
      `,
        },
        {
          code: `
        function foo() {
          if (something) {
            doSomething();
          } else {
            return true;
          }
        }
      `,
        },
        {
          code: `
        function foo() {
          if (something) {
            doSomething();
            return true;
          } else {
            return false;
          }
        }
      `,
        },
        {
          code: `
        function foo() {
          if (something) {
            return;
          } else {
            return true;
          }
        }
      `,
        },
        {
          code: `
        function foo() {
          if (something) {
            return true;
          }
        }
      `,
        },
        {
          code: `
        function foo() {
          if (something) {
            return foo(true);
          } else {
            return foo(false);
          }
        }
      `,
        },
        {
          code: `
        function foo() {
          if (something) {
            var x;
          } else {
            return false;
          }
        }
      `,
        },
        {
          code: `
        function foo() {
          if (something) {
            function f() {}
            return false;
          } else {
            return true;
          }
        }
      `,
        },
      ],
      invalid: [
        {
          code: `
        function foo() {
          if (something) {
            return true;
          } else {
            return false;
          }

          if (something) {
            return false;
          } else {
            return true;
          }

          if (something) return true;
          else return false;

          if (something) {
            return true;
          } else {
            return true;
          }
        }
      `,
          errors: [
            {
              messageId: 'replaceIfThenElseByReturn',
              line: 3,
              column: 11,
              endLine: 7,
              endColumn: 12,
              suggestions: [
                {
                  output: `
        function foo() {
          return !!(something);

          if (something) {
            return false;
          } else {
            return true;
          }

          if (something) return true;
          else return false;

          if (something) {
            return true;
          } else {
            return true;
          }
        }
      `,
                  desc: 'Replace with single return statement using "!!" cast',
                },
                {
                  output: `
        function foo() {
          return something;

          if (something) {
            return false;
          } else {
            return true;
          }

          if (something) return true;
          else return false;

          if (something) {
            return true;
          } else {
            return true;
          }
        }
      `,
                  desc: 'Replace with single return statement without cast (condition should be boolean!)',
                },
              ],
            },
            {
              messageId: 'replaceIfThenElseByReturn',
              line: 9,
              column: 11,
              endLine: 13,
              endColumn: 12,
              suggestions: [
                {
                  output: `
        function foo() {
          if (something) {
            return true;
          } else {
            return false;
          }

          return !(something);

          if (something) return true;
          else return false;

          if (something) {
            return true;
          } else {
            return true;
          }
        }
      `,
                  desc: 'Replace with single return statement',
                },
              ],
            },
            {
              messageId: 'replaceIfThenElseByReturn',
              line: 15,
              column: 11,
              endLine: 16,
              endColumn: 29,
              suggestions: [
                {
                  output: `
        function foo() {
          if (something) {
            return true;
          } else {
            return false;
          }

          if (something) {
            return false;
          } else {
            return true;
          }

          return !!(something);

          if (something) {
            return true;
          } else {
            return true;
          }
        }
      `,
                  desc: 'Replace with single return statement using "!!" cast',
                },
                {
                  output: `
        function foo() {
          if (something) {
            return true;
          } else {
            return false;
          }

          if (something) {
            return false;
          } else {
            return true;
          }

          return something;

          if (something) {
            return true;
          } else {
            return true;
          }
        }
      `,
                  desc: 'Replace with single return statement without cast (condition should be boolean!)',
                },
              ],
            },
            {
              messageId: 'replaceIfThenElseByReturn',
              line: 18,
              column: 11,
              endLine: 22,
              endColumn: 12,
              suggestions: [
                {
                  output: `
        function foo() {
          if (something) {
            return true;
          } else {
            return false;
          }

          if (something) {
            return false;
          } else {
            return true;
          }

          if (something) return true;
          else return false;

          return !!(something);
        }
      `,
                  desc: 'Replace with single return statement using "!!" cast',
                },
                {
                  output: `
        function foo() {
          if (something) {
            return true;
          } else {
            return false;
          }

          if (something) {
            return false;
          } else {
            return true;
          }

          if (something) return true;
          else return false;

          return something;
        }
      `,
                  desc: 'Replace with single return statement without cast (condition should be boolean!)',
                },
              ],
            },
          ],
        },
        {
          code: `
        function fn() {
          if (foo) {
            if (something) {
              return true
            }
            return false
          }

          if (bar) {
            if (something) {
              return false
            }
            return true
          }

          if (baz) {
            if (something) {
              return false
            }
          }
        }
      `,
          errors: [
            {
              messageId: 'replaceIfThenElseByReturn',
              line: 4,
              column: 13,
              endLine: 6,
              endColumn: 14,
              suggestions: [
                {
                  output: `
        function fn() {
          if (foo) {
            return !!(something);
          }

          if (bar) {
            if (something) {
              return false
            }
            return true
          }

          if (baz) {
            if (something) {
              return false
            }
          }
        }
      `,
                  desc: 'Replace with single return statement using "!!" cast',
                },
                {
                  output: `
        function fn() {
          if (foo) {
            return something;
          }

          if (bar) {
            if (something) {
              return false
            }
            return true
          }

          if (baz) {
            if (something) {
              return false
            }
          }
        }
      `,
                  desc: 'Replace with single return statement without cast (condition should be boolean!)',
                },
              ],
            },
            {
              messageId: 'replaceIfThenElseByReturn',
              line: 11,
              column: 13,
              endLine: 13,
              endColumn: 14,
              suggestions: [
                {
                  output: `
        function fn() {
          if (foo) {
            if (something) {
              return true
            }
            return false
          }

          if (bar) {
            return !(something);
          }

          if (baz) {
            if (something) {
              return false
            }
          }
        }
      `,
                  desc: 'Replace with single return statement',
                },
              ],
            },
          ],
        },
        {
          code: `
function foo() {
  if (bar()) {
    if (baz()) {
      return true;
    } else {
      return false;
    }
  }
  return qux();
}`,
          errors: [
            {
              messageId: 'replaceIfThenElseByReturn',
              suggestions: [
                {
                  messageId: 'suggestCast',
                  output: `
function foo() {
  if (bar()) {
    return !!(baz());
  }
  return qux();
}`,
                },
                {
                  messageId: 'suggestBoolean',
                  output: `
function foo() {
  if (bar()) {
    return baz();
  }
  return qux();
}`,
                },
              ],
            },
          ],
        },
        {
          code: `
function foo() {
  if (bar()) {
    if (baz()) {
      return true;
    }
    return false;
  }
  return qux();
}`,
          errors: [
            {
              messageId: 'replaceIfThenElseByReturn',
              suggestions: [
                {
                  messageId: 'suggestCast',
                  output: `
function foo() {
  if (bar()) {
    return !!(baz());
  }
  return qux();
}`,
                },
                {
                  messageId: 'suggestBoolean',
                  output: `
function foo() {
  if (bar()) {
    return baz();
  }
  return qux();
}`,
                },
              ],
            },
          ],
        },
        {
          code: `
function foo() {
  if (!bar()) {
    return true;
  } else {
    return false;
  }
}`,
          errors: [
            {
              messageId: 'replaceIfThenElseByReturn',
              suggestions: [
                {
                  messageId: 'suggest',
                  output: `
function foo() {
  return !bar();
}`,
                },
              ],
            },
          ],
        },
        {
          code: `
function foo() {
  if (bar() > 0) {
    return true;
  } else {
    return false;
  }
}`,
          errors: [
            {
              messageId: 'replaceIfThenElseByReturn',
              suggestions: [
                {
                  messageId: 'suggest',
                  output: `
function foo() {
  return bar() > 0;
}`,
                },
              ],
            },
          ],
        },
        {
          code: `
function foo() {
  if (baz() > 0) {
    return false;
  } else {
    return true;
  }
}`,
          errors: [
            {
              messageId: 'replaceIfThenElseByReturn',
              suggestions: [
                {
                  messageId: 'suggest',
                  output: `
function foo() {
  return !(baz() > 0);
}`,
                },
              ],
            },
          ],
        },
        {
          code: `
function foo() {
  if (baz()) {
    return false;
  } else {
    return true;
  }
}`,
          errors: [
            {
              messageId: 'replaceIfThenElseByReturn',
              suggestions: [
                {
                  messageId: 'suggest',
                  output: `
function foo() {
  return !(baz());
}`,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
