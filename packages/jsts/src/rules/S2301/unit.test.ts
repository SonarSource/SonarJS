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
import { rule as S2301 } from './index.js';
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S2301', () => {
  it('S2301', () => {
    const ruleTester = new RuleTester();

    ruleTester.run('S2301:TypeScript', S2301, {
      invalid: [
        {
          name: 'RSPEC non-compliant code example',
          code: `function tempt1(name: string, ofAge: boolean) {
  if (ofAge) {
    offerLiquor(name);
  } else {
    offerCandy(name);
  }
}

function tempt2(name: string, ofAge: boolean) {
  ofAge ? offerLiquor(name) : offerCandy(name);
}

function tempt3(name: string, ofAge: boolean) {
  return ofAge ? offerLiquor(name) : offerCandy(name);
}
`,
          options: ['sonar-runtime'],
          errors: [
            {
              line: 2,
              column: 7,
              endLine: 2,
              endColumn: 12,
              messageId: 'sonarRuntime',
              data: {
                parameterName: 'foo',
                sonarRuntimeData: JSON.stringify({
                  message:
                    'Provide multiple methods instead of using "ofAge" to determine which action to take.',
                  secondaryLocations: [
                    {
                      message: 'Parameter "ofAge" was declared here',
                      column: 30,
                      line: 1,
                      endColumn: 44,
                      endLine: 1,
                    },
                  ],
                }),
              },
            },
            {
              line: 10,
              column: 3,
              endLine: 10,
              endColumn: 8,
              messageId: 'sonarRuntime',
              data: {
                parameterName: 'foo',
                sonarRuntimeData: JSON.stringify({
                  message:
                    'Provide multiple methods instead of using "ofAge" to determine which action to take.',
                  secondaryLocations: [
                    {
                      message: 'Parameter "ofAge" was declared here',
                      column: 30,
                      line: 9,
                      endColumn: 44,
                      endLine: 9,
                    },
                  ],
                }),
              },
            },
            {
              line: 14,
              column: 10,
              endLine: 14,
              endColumn: 15,
              messageId: 'sonarRuntime',
              data: {
                parameterName: 'foo',
                sonarRuntimeData: JSON.stringify({
                  message:
                    'Provide multiple methods instead of using "ofAge" to determine which action to take.',
                  secondaryLocations: [
                    {
                      message: 'Parameter "ofAge" was declared here',
                      column: 30,
                      line: 13,
                      endColumn: 44,
                      endLine: 13,
                    },
                  ],
                }),
              },
            },
          ],
        },
      ],
      valid: [
        {
          name: `RSPEC compliant code example`,
          options: ['sonar-runtime'],
          code: `function temptAdult(name: string) {
  offerLiquor(name);
}

function temptChild(name: string) {
  offerCandy(name);
}

function tempt1(name: string, ofAge: boolean) {
  const foo = 5;

  ofAge ? offerLiquor(name) : offerCandy(name);
}

function tempt2(name: string, ofAge: boolean) {
  const foo = 5;

  ofAge ? offerLiquor(name) : offerCandy(name);
}

function tempt3(name: string, ofAge: boolean) {
  ofAge ? offerLiquor(name) : offerCandy(name);

  const foo = 5;
}

function tempt4(name: string, ofAge: boolean) {
  const foo = 5;

  return ofAge ? offerLiquor(name) : offerCandy(name);
}

function tempt5(name: string, ofAge: boolean) {
  return ofAge ? offerLiquor(name) : offerCandy(name);

  const foo = 5;
}

function tempt6(name: string, ofAge: boolean) {
  const foo = 5;

  if (ofAge) {
    offerLiquor(name);
  } else {
    offerCandy(name);
  }
}

function tempt7(name: string, ofAge: boolean) {
  if (ofAge) {
    offerLiquor(name);
  } else {
    offerCandy(name);
  }

  const foo = 5;
}

function tempt8(name: string, ofAge: boolean) {
  if (ofAge) {
    offerLiquor(name);
  }
}
`,
        },
      ],
    });

    const javaScriptRuleTester = new RuleTester();

    javaScriptRuleTester.run('S2301:JavaScript', S2301, {
      invalid: [],
      valid: [
        {
          name: `RSPEC compliant code example`,
          options: ['sonar-runtime'],
          code: `function temptAdult(name) {
  offerLiquor(name);
}

function temptChild(name) {
  offerCandy(name);
}

function tempt1(name, ofAge) {
  const foo = 5;

  ofAge ? offerLiquor(name) : offerCandy(name);
}

function tempt2(name, ofAge) {
  const foo = 5;

  ofAge ? offerLiquor(name) : offerCandy(name);
}

function tempt3(name, ofAge) {
  ofAge ? offerLiquor(name) : offerCandy(name);

  const foo = 5;
}

function tempt4(name, ofAge) {
  const foo = 5;

  return ofAge ? offerLiquor(name) : offerCandy(name);
}

function tempt5(name, ofAge) {
  return ofAge ? offerLiquor(name) : offerCandy(name);

  const foo = 5;
}

function tempt6(name, ofAge) {
  const foo = 5;

  if (ofAge) {
    offerLiquor(name);
  } else {
    offerCandy(name);
  }
}

function tempt7(name, ofAge) {
  if (ofAge) {
    offerLiquor(name);
  } else {
    offerCandy(name);
  }

  const foo = 5;
}

function tempt8(name, ofAge) {
  if (ofAge) {
    offerLiquor(name);
  } else {
    offerCandy(name);
  }
}

function tempt9(name, ofAge) {
  ofAge ? offerLiquor(name) : offerCandy(name);
}

function tempt10(name, ofAge) {
  return ofAge ? offerLiquor(name) : offerCandy(name);
}
`,
        },
      ],
    });
  });
});
