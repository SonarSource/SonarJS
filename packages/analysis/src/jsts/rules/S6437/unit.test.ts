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

describe('S6437', () => {
  it('S6437', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('Rule S6437 - hardcoded credentials', rule, {
      valid: [
        {
          // fqn cannot be resolved
          code: `doSomethingRandom('zQ9mPfXtRk3wDbn');`,
        },
        {
          // template literal with an expression is not considered hardcoded
          code: `
            import crypto from 'node:crypto';
            const suffix = 'zQ9mPfXtRk3wDbn';
            crypto.createHmac('sha256', \`prefix-\${suffix}\`);
          `,
        },
        {
          // BinaryExpression is not a hardcoded string
          code: `
            import crypto from 'node:crypto';
            crypto.createHmac('sha256', 'zQ9' + 'mPfXtRk3wDbn');
          `,
        },
        {
          // variable initialized from a call is not tracked as hardcoded
          code: `
            import crypto from 'node:crypto';
            const dynamicSecret = getSecret();
            crypto.createHmac('sha256', dynamicSecret);
          `,
        },
        {
          // spread element in call arguments is ignored
          code: `
            import crypto from 'node:crypto';
            const args = ['sha256', 'zQ9mPfXtRk3wDbn'];
            crypto.createHmac(...args);
          `,
        },
        {
          // fewer arguments than the configured secret index
          code: `
            import superagent from 'superagent';
            superagent.auth();
          `,
        },
        {
          // no arguments at all for a secret-object signature
          code: `
            import session from 'express-session';
            session();
          `,
        },
        {
          // argument is not an object expression
          code: `
            import session from 'express-session';
            session(getSessionOptions());
          `,
        },
        {
          // object expression missing the secret property
          code: `
            import session from 'express-session';
            session({ name: 'connect.sid' });
          `,
        },
        {
          // array of secrets containing only a spread element and a dynamic identifier
          code: `
            import cookieSession from 'cookie-session';
            const extraKeys = [];
            const dynamicKey = getKey();
            cookieSession({ keys: [...extraKeys, dynamicKey] });
          `,
        },
        {
          // hardcoded value assigned through a variable that itself is an excluded placeholder
          code: `
            import session from 'express-session';
            const secret = 'changeit';
            session({ secret });
          `,
        },
      ],
      invalid: [
        {
          // template literal without any expression is hardcoded
          code: `
            import crypto from 'node:crypto';
            crypto.createHmac('sha256', \`zQ9mPfXtRk3wDbn\`);
          `,
          errors: 1,
        },
        {
          code: `
            import { SignJWT } from 'jose';
            SignJWT('zQ9mPfXtRk3wDbn');
          `,
          errors: 1,
        },
        {
          code: `
            import { jwtVerify } from 'jose';
            jwtVerify(token, 'zQ9mPfXtRk3wDbn');
          `,
          errors: 1,
        },
        {
          code: `
            import jose from 'node-jose';
            jose.JWK.asKey('zQ9mPfXtRk3wDbn');
          `,
          errors: 1,
        },
      ],
    });
  });
});
