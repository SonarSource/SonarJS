import { runTest } from '../../test';

const code = `
function bar(value) {
	if (value.name) {
	}
}

function foo(token) {
	if (token) {
		return bar(token.value); // Noncompliant (or line 8)
	}
}


foo('baz')`;

runTest('t01-12', code);
