const elements = [undefined]
const offset = 'off';
function bar () {};

elements.forEach((element, index) => {
	if (offset === "off") {
		foo(element); // element might be null/undefined
	}
	if (index === 0 || !element) {
		return;
	}
	otherLogic(element);
});

function foo(token) {
	return bar(token.loc.start.line); // Noncompliant: token might be undefined
}
