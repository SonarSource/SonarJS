function raiseNewException() {
  throw new Error();
}

function raiseParam(param) {
  throw param;
}

function bareRaise() {
  throw new Error();
}

function raiseFrom(param) {
  throw new Error("ValueError");
}

function python2RaiseNotSupported() {
  throw new Error("a message");
}
