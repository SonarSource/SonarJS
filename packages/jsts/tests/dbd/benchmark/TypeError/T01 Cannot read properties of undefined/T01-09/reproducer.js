function loadAll(pluginNames) {
	pluginNames.foo(); // Noncompliant: pluginNames might be undefined
}

loadAll();
