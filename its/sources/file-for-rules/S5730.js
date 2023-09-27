const csp = require('helmet-csp');
module.exports.sensitiveMixedContent = function(app) {
  app.use(
    csp({
      directives: {
        defaultSrc: ["'self'", 'example.com', 'code.jquery.com'],
      } // Sensitive: blockAllMixedContent is not set
    })
  );
};
