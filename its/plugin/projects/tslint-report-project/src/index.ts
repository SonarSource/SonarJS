function foo() {
  let x = 42;
  x = 0, 5;   // external_tslint:no-unused-expression
  if (x > 0) {
    let y = 42 // external_tslint:prefer-const, external_tslint:semicolon
    return y;
  } else // external_tslint:curly
    return x;
}
