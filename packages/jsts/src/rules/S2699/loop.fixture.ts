const chai = require('chai');

// this file tests an infinite loop issue that was introduced in 7e1b24d2019921c6c46440579274541c3f3ddde4
// This is a simplified case of the original:
// https://github.com/angular/angular/blob/440684ddb4a2b651e4fbd301978b7895f1750c1b/packages/compiler-cli/src/ngtsc/reflection/test/ts_host_spec.ts#L38

describe('test cases', () => {

  it('should reflect a single argument', () => { // Noncompliant
    expectParameter(args[0], 'bar', 'Bar');
  });
});

function expectParameter(
  param: CtorParameter, name: string, type?: string|{name: string, moduleName: string},
  decorator?: string, decoratorFrom?: string): void {
    argExpressionToString(param.typeValueReference.expression);
}

function argExpressionToString(name: ts.Node|null): string {
  if (name == null) {
    throw new Error('\'name\' argument can\'t be null');
  }

  if (ts.isIdentifier(name)) {
    return name.text;
  } else if (ts.isPropertyAccessExpression(name)) {
    return `${argExpressionToString(name.expression)}.${name.name.text}`;
  } else {
    throw new Error(`Unexpected node in arg expression: ${ts.SyntaxKind[name.kind]}.`);
  }
}
