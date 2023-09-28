const dnsPrefetchControl = require('dns-prefetch-control')
const helmet = require('helmet')
module.exports.sensitiveDnsPrefetch = function(app) {
	var options = { allow: true };
	app.use(dnsPrefetchControl(options)) // Sensitive
}; 