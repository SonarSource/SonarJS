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
import { describe, it } from 'node:test';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';

describe('S5906', () => {
  it('reports Chai BDD generic assertions', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    const expectedError = (output: string) => ({
      messageId: 'preferSpecificAssertion',
      suggestions: [{ messageId: 'quickfix', output }],
    });

    ruleTester.run('prefer-specific-assertions', rule, {
      valid: [],
      invalid: [
        {
          code: `
            import { expect } from 'chai';

            expect(value).to.equal(null);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(value).to.be.null;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            value.should.equal(undefined);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            value.should.be.undefined;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            (1).should.equal(undefined);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            (1).should.be.undefined;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            (foo?.bar).should.equal(undefined);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            (foo?.bar).should.be.undefined;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            foo?.bar.should.equal(undefined);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            foo?.bar.should.be.undefined;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(items.length).to.equal(2);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(items).to.have.lengthOf(2);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(user instanceof User).to.equal(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(user).to.be.instanceOf(User);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(total <= 0).to.equal(false);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(total).to.be.above(0);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(text.includes('admin')).to.not.equal(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(text).to.not.include('admin');
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(result, 'value type').to.equal(undefined);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(result, 'value type').to.be.undefined;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(value).to.eq(null);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(value).to.be.null;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            value.should.equals(undefined);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            value.should.be.undefined;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(value).to.eqls(null);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(value).to.be.null;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            (user instanceof User).should.equal(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            user.should.be.instanceOf(User);
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            user.name.should.equal(undefined);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            user.name.should.be.undefined;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            getName().should.equal(null);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            getName().should.be.null;
          `),
          ],
        },
        {
          code: `
            import { expect } from 'chai';

            expect(typeof result === 'number').to.eql(true);
          `,
          errors: [
            expectedError(`
            import { expect } from 'chai';

            expect(typeof result).to.equal('number');
          `),
          ],
        },
      ],
    });
  });
});
