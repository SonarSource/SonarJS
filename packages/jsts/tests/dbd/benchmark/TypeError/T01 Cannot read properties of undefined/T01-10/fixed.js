const elements = [undefined]
const offset = 'off';
function bar () {};

elements.forEach((element, index) => {
	if (!element) {

		// Skip holes in arrays
		return;
	}
	if (offset === "off") {
		foo(element);
	}

	// Offset the following elements correctly relative to the first element
	if (index === 0) {
		return;
	}
});

function foo(token) {
	return bar(token?.loc.start.line);
}
