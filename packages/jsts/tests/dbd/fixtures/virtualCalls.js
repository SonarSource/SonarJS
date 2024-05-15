class Animal:
    def speak(self):
        print("Animal Speaking")

class Dog(Animal):
    def bark(self):
        self.speak()
        print("dog barking")
    def speak(self):
        print("Dog Speaking")

class Main:
    def main(self):
        d = Dog()
        d.bark()
        d.speak()
