
  import foo from "foo";
  for (var i = 0; i < 10; i++) {
    console.log("i is " + i);
    break; // nosonar
  }
  foo("Hello, world"); foo("Hello, world");
