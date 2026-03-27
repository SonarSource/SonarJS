    module MyModule { // Noncompliant [[qf!]] {{Use 'namespace' instead of 'module' to declare custom TypeScript modules.}}
//  ^^^^^^
// edit@qf [[sc=4;ec=10]] {{namespace}}
      const x = 42;
    }
