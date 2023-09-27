const helmet = require('helmet');
module.exports.sensitiveNoSniff = function(app) {
  app.use(
    helmet({
      noSniff: false, // Sensitive
    })
  );
};
