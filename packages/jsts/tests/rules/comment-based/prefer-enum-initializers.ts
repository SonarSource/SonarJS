enum Direction {
    Up = "Up",
    Down = "Down"
}

enum Color {
    Red, // Noncompliant {{The value of the member 'Red' should be explicitly defined.}}
//  ^^^
    Green = 0b000000001111111100000000,
    Blue  = 0b000000000000000011111111
}

enum Truthiness {
    Falsy = 0,
    Truthy
}

enum Key {
    Up = 1,
    Down, // Noncompliant
    Left, // Noncompliant
    Right = 42
}
