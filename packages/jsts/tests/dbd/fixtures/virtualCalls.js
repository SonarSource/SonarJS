class Animal {
  speak() {
    console.log("Animal Speaking");
  }
}

class Dog extends Animal {
  bark() {
    this.speak();
    console.log("dog barking");
  }
  speak() {
    console.log("Dog Speaking");
  }
}

class Main {
  main() {
    let d = new Dog();
    d.bark();
    d.speak();
  }
}
