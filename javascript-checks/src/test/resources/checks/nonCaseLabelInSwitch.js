switch (a) {
  case 0:
  case 1:
    case2:                      // Noncompliant {{Remove this misleading "case2" label.}}
//  ^^^^^
        doSomething();
    break;
}

switch (a) {
  case 0:
    break;
  case 1:
    label:while (a) {           // Noncompliant
      break label;
    }
    break;
}

switch (a) {
  case 0:
  case 1:
  {
    label:while (b) {           // Noncompliant
      doSomething(b);
      break label;
    }
  }
}

switch (a) {
    case 0:
    case 1:
    {
        function f () {
            label:while (b) {   // OK
                doSomething(b);
                break label;
            }
        }
    }
}

switch (a) {                    // OK
  case 0:
  case 1:
    while(b) {
    }
}
