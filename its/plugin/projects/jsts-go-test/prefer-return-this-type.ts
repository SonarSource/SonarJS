// S6565: prefer-return-this-type — method should return 'this' type
class Builder {
  setValue(value: string): Builder { // Noncompliant: should return 'this'
    return this;
  }
}
