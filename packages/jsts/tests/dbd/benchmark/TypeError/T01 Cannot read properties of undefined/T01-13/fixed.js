const ruleSetIdx = 'bar'
const lintResults = [{
	ruleId: 'foo'
}];
const lintedRegistry = {
	rules: {
		foo: {
			bar: {
				errorCount: 0
			}
		}
	},
};

lintResults.forEach(function(result) {
	if (lintedRegistry.rules[result.ruleId][ruleSetIdx]) {
		lintedRegistry.rules[result.ruleId][ruleSetIdx].errorCount += 1;
	}
});
