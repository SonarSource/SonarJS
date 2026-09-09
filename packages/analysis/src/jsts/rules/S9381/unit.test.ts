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
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S9381', () => {
  it('S9381', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('Promises should not be nested', rule, {
      valid: [
        {
          // flat chain: no nesting at all
          code: `
doThing()
  .then(a => getB(a))
  .then(b => getC(b));
`,
        },
        {
          // nesting is allowed when the inner call needs a variable from the outer callback's scope
          code: `
doThing().then(a => getB(a).then(b => getC(a, b)));
`,
        },
        {
          // fan-out via .map() building independent promises for Promise.all() - the
          // intervening .map() callback is not itself a promise callback, so this is
          // not avoidable sequential nesting relative to the outer .then().
          code: `
doThing().then(() => {
  return Promise.all(
    users.map(user => {
      return save(user).then(() => {
        return { user, success: true };
      });
    })
  );
});
`,
        },
        {
          // a deferred event-handler closure - the inner .then() runs later, on a
          // click, not as part of resolving the outer .then().
          code: `
fetchImages().then(images => {
  const handleDeletion = id => {
    deleteImage(id).then(() => {
      refresh();
    });
  };
});
`,
        },
        {
          // nesting forced by a transaction callback contract - the inner .then()
          // belongs to the transaction's own body, bound to handle \`t\`.
          code: `
readUser(options).then(function (result) {
  return db.transaction(function (t) {
    return destroyStuff(options).then(function () {
      t.commit();
    });
  });
});
`,
        },
        {
          // a Promise executor is not itself a promise callback either - its parent is
          // a NewExpression, not a .then()/.catch() call - so the inner .then()/.catch()
          // adopting the constructed promise is not avoidable sequential nesting.
          code: `
doThing().then(user => {
  return new Promise((resolve, reject) => {
    save(user).then(resolve).catch(reject);
  });
});
`,
        },
        {
          // known limitation, not a case this decorator is meant to fix: nesting
          // inside a plain named function that is declared and then invoked
          // synchronously nearby (not deferred, not an intervening callback handed to
          // another API) is still suppressed, because the decorator can't tell "called
          // synchronously right here" apart from "called later, by someone else".
          code: `
doThing().then(function (result) {
  function render() {
    return renderStep(result).then(function () {
      return finish();
    });
  }

  if (result.shouldRender) {
    return render();
  }
  return skip();
});
`,
        },
        {
          // deliberate, not a gap: a .finally() callback is not treated as a promise
          // callback either, so nesting inside one is suppressed. Unlike .then()/
          // .catch(), flattening this would change behavior: .finally() always passes
          // through the *original* settled value to whatever follows it, discarding
          // its own callback's resolution - so pulling the inner .then() out to sit
          // after the .finally() would feed it a completely different value (verified
          // at runtime: `Promise.resolve('X').finally(() => Promise.resolve('Y').then(y
          // => ...)).then(v => ...)` - the outer .then() sees "X", never "Y").
          code: `
doThing().then(() => {
  return step().finally(() => {
    return cleanup().then(() => {
      return afterCleanup();
    });
  });
});
`,
        },
      ],
      invalid: [
        {
          // a .then() nested inside another .then()
          code: `
doThing().then(function (result) {
  return doSomethingElse(result).then(function (newResult) {
    return doThirdThing(newResult);
  });
});
`,
          errors: [{ messageId: 'avoidNesting' }],
        },
        {
          // a .catch() nested inside another .catch()
          code: `
doThing().catch(function (err) {
  return logError(err).catch(function () {
    return null;
  });
});
`,
          errors: [{ messageId: 'avoidNesting' }],
        },
        {
          // genuine nesting still reported *inside* an intervening function: relative
          // to its own nearest enclosing callback (`item => {...}`, itself a promise
          // callback via `.then()`), this nesting is exactly the ordinary case and must
          // not be swallowed by the fan-out suppression above.
          code: `
doThing().then(() => {
  return Promise.all(
    items.map(item => {
      return step1(item).then(x => {
        return step2(x).then(y => {
          return y;
        });
      });
    })
  );
});
`,
          errors: [{ messageId: 'avoidNesting' }],
        },
      ],
    });
  });
});
