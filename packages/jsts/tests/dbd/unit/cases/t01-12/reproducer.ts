import { runTest } from '../../test';

const code = `function foo(token) {
	if (token) {
		return bar(token.value); // Noncompliant (or line 8)
	}
}

function bar(value) {
	if (value.name) {
	}
}

foo('baz')`;

runTest('t01-12', code);
