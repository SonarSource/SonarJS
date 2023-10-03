const csp = require('helmet-csp');
const helmet = require('helmet');
module.exports.sensitiveCspFrame = function(app) {
  app.use(
    csp({
      directives: {
        defaultSrc: ["'self'", 'example.com', 'code.jquery.com'],
      } // Sensitive: frame-ancestors is not set
    })
  );

  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
      }, // Sensitive: frameAncestors is not set
    }),
  );

  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["'none'"],
      }, // Sensitive: frameAncestors is set to none
    }),
  );
};
