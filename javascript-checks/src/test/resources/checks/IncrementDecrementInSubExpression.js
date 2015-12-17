function bar(foo) {
    i++;
    ++i;
    i--;
    --i;

    foo[i]++;
    foo[i++]++; // Noncompliant

    foo[i++] = 0; // Noncompliant {{Extract this increment operation into a dedicated statement.}}
    foo[i--] = 0; // Noncompliant {{Extract this decrement operation into a dedicated statement.}}
    foo[++i] = 0; // Noncompliant [[sc=9;ec=11]]
    foo[--i] = 0; // Noncompliant

    foo[-i] = 0;

    return i++;      // Noncompliant
    return ++i;      // Noncompliant
    return foo[++i]; // Noncompliant

    throw foo[i++]; // Noncompliant

    j = i++ - 1;  // Noncompliant
    j = 5 * --i;  // Noncompliant
    bar(i++);     // Noncompliant

    for (var i = 0; i < 10; i++, j++) {
    }

    for (var i = 0; i < 10; i = j++ - 2, i++) {  // Noncompliant [[sc=34]]
    }

    for (i++ ; i < 10; i++) {    // Noncompliant [[sc=11]]
    }

    for (var i = 0; i++ < 10; i++) {  // Noncompliant
    }

    while (i++ > 10) {  // Noncompliant
    }

    while (i++) {  // Noncompliant
    }

    do {
    } while (i++); // Noncompliant

    with (foo[i++]) { // Noncompliant
    }

    for (prop in foo[i++]) { // Noncompliant
    }

    if (i++) { // Noncompliant
    }

    switch (i++) {      // Noncompliant
      case j++: break;  // Noncompliant
      default: break;
    }
}
