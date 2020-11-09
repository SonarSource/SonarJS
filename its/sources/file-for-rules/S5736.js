const helmet = require('helmet');
module.exports.sensitiveReferrerPolicy = function(app) {
  app.use(
    helmet({
      referrerPolicy: false, // Sensitive
    })
  );
};
