const node = {
  arguments: [undefined],
};


///
subject = node.arguments[0];
object = subject.object; // Noncompliant: subject might be undefined
