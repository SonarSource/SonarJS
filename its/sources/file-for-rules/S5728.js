const helmet = require('helmet');
module.exports.sensitiveCsp = function(app) {
  app.use(
    helmet({
      contentSecurityPolicy: false, // Sensitive
    })
  );
};
