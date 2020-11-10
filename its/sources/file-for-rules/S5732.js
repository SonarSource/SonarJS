const csp = require('helmet-csp');
module.exports.sensitiveCspFrame = function(app) {
  app.use(
    csp({
      directives: {
        defaultSrc: ["'self'", 'example.com', 'code.jquery.com'],
      } // Sensitive: frame-ancestors is not set
    })
  );
};
