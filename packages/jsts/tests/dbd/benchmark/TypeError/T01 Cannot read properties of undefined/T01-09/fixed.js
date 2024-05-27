function debug(msg) {
	console.log(msg);
}

function loadAll(pluginNames) {

	// if "plugins" in config is not an array, throw an error so user can fix their config.
	if (!Array.isArray(pluginNames)) {
		const pluginNotArrayMessage = "ESLint configuration error: \"plugins\" value must be an array";

		debug(`${pluginNotArrayMessage}: ${JSON.stringify(pluginNames)}`);

		console.error(pluginNotArrayMessage);
	}

	// load each plugin by name
}

loadAll();
