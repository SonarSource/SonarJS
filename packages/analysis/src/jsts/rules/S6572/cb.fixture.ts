enum Direction {
    Up = "Up",
    Down = "Down"
}

enum Color {
    Red, // Noncompliant [[qf1,qf2=0,qf3=0]] {{The value of the member 'Red' should be explicitly defined.}}
//  ^^^
  // fix@qf1 {{Can be fixed to Red = 0}}
  // edit@qf1 {{    Red = 0,}}
  // fix@qf2 {{Can be fixed to Red = 1}}
  // edit@qf2 {{    Red = 1,}}
  // fix@qf3 {{Can be fixed to Red = 'Red'}}
  // edit@qf3 {{    Red = 'Red',}}
    Green = 0b000000001111111100000000,
    Blue  = 0b000000000000000011111111
}

enum Truthiness {
    Falsy = 0,
    Truthy
}

enum Key {
    Up = 1,
    Down, // Noncompliant [[qf4,qf5=0,qf6=0]] {{The value of the member 'Down' should be explicitly defined.}}
    // fix@qf4 {{Can be fixed to Down = 1}}
    // edit@qf4 {{    Down = 1,}}
    // fix@qf5 {{Can be fixed to Down = 2}}
    // edit@qf5 {{    Down = 2,}}
    // fix@qf6 {{Can be fixed to Down = 'Down'}}
    // edit@qf6 {{    Down = 'Down',}}
    Left, // Noncompliant [[qf7,qf8=0,qf9=0]] {{The value of the member 'Left' should be explicitly defined.}}
    // fix@qf7 {{Can be fixed to Left = 2}}
    // edit@qf7 {{    Left = 2,}}
    // fix@qf8 {{Can be fixed to Left = 3}}
    // edit@qf8 {{    Left = 3,}}
    // fix@qf9 {{Can be fixed to Left = 'Left'}}
    // edit@qf9 {{    Left = 'Left',}}
    Right = 42
}
