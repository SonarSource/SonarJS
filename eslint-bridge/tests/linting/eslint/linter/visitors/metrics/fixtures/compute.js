/**
 * header
 */

class C {
  /* return 'foo' */
  m = function() { // NOSONAR
  	return foo() || bar();
  };
}
