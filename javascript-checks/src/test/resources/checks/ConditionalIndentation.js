
    x = 7;
    arr = array(1, 2);

    function doTheThing() { }
    function doTheOtherThing() { }

    if (x > 0)  // Noncompliant [[ID=ID1]] {{Use curly braces or indentation to denote the code conditionally executed by this "if".}}
//  ^^
    doTheThing();
//S ^^^^^^^^^^ ID1
    doTheOtherThing();

    if (x > 0)
      doTheThing();
    doTheOtherThing();

    if (x > 0) {
      doTheThing();
      doTheOtherThing();
    }

    if (x > 0)
    {
      doTheThing();
      doTheOtherThing();
    }

    if (cond) {
    } else // Noncompliant
      foo();

    while (x <= 10) // Noncompliant
    doTheThing();
    doTheOtherThing();

    while (x <= 10)
      doTheThing();
    doTheOtherThing();

    while (x <= 10) {
      doTheThing();
      doTheOtherThing();
    }

    if (x == 5) // Noncompliant
    doTheThing();
    else if (x == 6) // Noncompliant
    doTheThing();
    else // Noncompliant
    doTheThing();

    if (x == 5)
      doTheThing();
    else if (x == 6)
      doTheThing();
    else
      doTheThing();


    for (x in arr) // Noncompliant
    doTheThing();
    doTheOtherThing();

    for (x in arr)
      doTheThing();
    doTheOtherThing();

    for (x in arr)  {
      doTheThing();
      doTheOtherThing();
    }

    for (x = 1; x <= 10; x++) // Noncompliant
    doTheThing();
    doTheOtherThing();
    for (x = 1; x <= 10; x++)
      doTheThing();
    doTheOtherThing();
    for (x = 1; x <= 10; x++) {
      doTheThing();
      doTheOtherThing();
    }
