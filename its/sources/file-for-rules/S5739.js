const hsts = require('hsts');
module.exports.sensitiveHsts = function(app) {  
  app.use(
    hsts({
      maxAge: 3153600, // Sensitive, recommended >= 15552000
      includeSubDomains: false, // Sensitive
    })
  );
};
