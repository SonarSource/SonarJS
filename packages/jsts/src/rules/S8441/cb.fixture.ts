const express = require('express');
const session = require('express-session');
const path = require('path');

// Test case 1: Basic case
{
  const app = express();

  app.use(session({secret: process.env.SESSION_SECRET}));
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Session middleware declared here.}}
  app.use(express.static(path.join(__dirname, 'app/assets')));  // Noncompliant {{Move this static middleware before the session middleware.}}
}

// Test case 2: Middleware as variable (not CallExpression)
{
  const app2 = express();
  const sessionMiddleware = session({secret: 'test'});
  const staticMiddleware = express.static('public');

  app2.use(sessionMiddleware);
//^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Session middleware declared here.}}
  app2.use(staticMiddleware); // Noncompliant {{Move this static middleware before the session middleware.}}
}

// Test case 3: App injection via module.exports
module.exports = function setupApp(app: any) {
  app.use(session({secret: 'test'}));
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Session middleware declared here.}}
  app.use(express.static('public')); // Noncompliant {{Move this static middleware before the session middleware.}}
};

// Test case 4: Nested function with scope isolation
{
  function testNestedScope() {
    const innerApp = express();

    function innerSetup() {
      innerApp.use(session({secret: 'inner'}));
//    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Session middleware declared here.}}
      innerApp.use(express.static('inner')); // Noncompliant {{Move this static middleware before the session middleware.}}
    }

    innerSetup();
  }

  testNestedScope();
}
