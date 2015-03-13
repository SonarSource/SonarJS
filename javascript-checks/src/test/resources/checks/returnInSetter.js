var person = {
  set name(name) {
    this.name = name;
    return 42;  // Noncompliant
  },
  set other(other) {
    this.other = other;
    return;
  },
  set other2(other2) {
    this.other2 = other2;
  },
  get name() {
	return 42;  
  },
  x: function() {
	  return 42;
  }
}