const lintResults = [undefined];
const lintedRegistry = {
	rules: [],
};

lintResults.forEach(function(result) {
	lintedRegistry.rules[result.ruleId][ruleSetIdx].errorCount += 1; // Noncompliant: any of those intermediate properties can be undefined
});
