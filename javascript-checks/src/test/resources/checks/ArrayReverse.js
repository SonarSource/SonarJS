function main() {

  let a = [];
  let d;

  const prop = a.reverse // OK, not actually invoking the method
  const b = a.reverse(); // Noncompliant {{Move this array "reverse" operation to a separate statement.}}
//          ^^^^^^^^^^^

  a.slice().reverse().forEach(() => {}); // OK, there is `slice`

  a.reverse(); // OK

  a.map(() => true).reverse(); // OK

  a = a.reverse(); // OK, just a minor code-smell

  d = a.reverse(); // Noncompliant
//    ^^^^^^^^^^^

  a, d = a.reverse(); // Noncompliant
//       ^^^^^^^^^^^

  something(a.reverse()); // Noncompliant
//          ^^^^^^^^^^^

  const c = [1, 2, 3].reverse(); // OK

  function foo() {
    const keys = [];

    const x = keys.reverse(); // Noncompliant
//            ^^^^^^^^^^^^^^

    return keys.reverse();
  }

  class Bar {
    field = [];

    method() {
      const b = this.field.reverse(); // FN we don't track fields

      this.field.reverse(); // OK

      const c = this.getFieldCopy().reverse(); // OK
    }

    getFieldCopy() {
      return [...this.field];
    }
  }

  function change(s: string): string {
    return s.split("").reverse().join(); // OK
  }

  class NotArray {
    reverse() {}
  }

  const notArray = new NotArray();

  const notArrayReversed = notArray.reverse(); // OK

}
