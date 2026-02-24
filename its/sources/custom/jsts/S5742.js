const helmet = require('helmet');
module.exports.sensitiveExpectCt = function(app) {
  app.use(
    helmet({
      expectCt: false, // Sensitive
    })
  );
};
